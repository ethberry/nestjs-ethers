import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Interface } from "@ethersproject/abi";

import { EthersAbstractService } from "./ethers.abstract.service";
import { getPastEvents, parseLog } from "./utils/utils";

@Injectable()
export class EthersContractService extends EthersAbstractService {
  private latency: number;
  private fromBlockNumber: number;
  private toBlockNumber: number;

  public async init(): Promise<void> {
    this.latency = ~~this.configService.get<string>("LATENCY", "32");
    this.fromBlockNumber = ~~this.configService.get<string>("STARTING_BLOCK", "0");
    this.toBlockNumber = await this.provider.getBlockNumber();
    return this.getPastEvents(this.toBlockNumber, this.toBlockNumber - this.latency);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  public async listen(): Promise<void> {
    this.fromBlockNumber = this.toBlockNumber;
    this.toBlockNumber = await this.provider.getBlockNumber();
    return this.getPastEvents(this.toBlockNumber, this.toBlockNumber - this.latency);
  }

  public async getPastEvents(fromBlockNumber: number, toBlockNumber: number): Promise<void> {
    await Promise.all(
      this.options.map(async contractOption => {
        const { contractAddress, contractInterface, contractName, eventNames = [] } = contractOption;

        const events = await getPastEvents(this.provider, contractAddress, fromBlockNumber, toBlockNumber, 1000);

        const iface = contractInterface instanceof Interface ? contractInterface : new Interface(contractInterface);

        for (const log of events) {
          const description = parseLog(iface, log);
          if (!description || !eventNames.includes(description.name)) {
            return;
          }
          void this.call({ contractName, eventName: description.name }, description, log);
        }
      }),
    );
  }
}

/*

@Module({
  imports: [
    ConfigModule,
    EthersContractModule.forRootAsync(EthersContractModule, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Array<IContractOptions> => {
        const resourcesMarketplaceAddr = configService.get<string>("ERC1155_MARKETPLACE_ADDR", "");
        return [
          {
            contractName: ContractType.ERC1155_MARKETPLACE,
            contractAddress: resourcesMarketplaceAddr,
            contractInterface: ERC1155Marketplace.abi as Array<AbiItem>,
            // prettier-ignore
            eventNames: [
              Erc1155MarketplaceEventType.Redeem,
            ],
          },
        ];
      },
    }),
  ],
})
export class BlockchainModule implements OnModuleDestroy {
  constructor(
    private readonly ethersContractService: EthersContractService,
  ) {}

  // not sure we need this at all
  public async onModuleDestroy(): Promise<void> {
    await this.ethersContractService.destroy();
  }
}



@Controller()
export class ExampleControllerWs {
  constructor(private readonly exampleServiceWs: ExampleServiceWs) {}

  @EventPattern({ contractName: "EXAMPLE", eventName: "EXAMPLE" })
  public purchaseToken(@Payload() event: IEvent<IExample>, @Ctx() ctx: Log): Promise<void> {
    return this.exampleServiceWs.example(event, context);
  }
}


@Injectable()
export class ExampleServiceWs {
  constructor(
    @Inject(Logger)
    private readonly loggerService: LoggerService,
  ) {}

  public async example(event: IEvent<IExample>, ctx: Log): Promise<void> {
    const {
      name: "EXAMPLE"
      args: { ... },
    } = event;

    await this.updateHistory(event, ctx);
  }

  private async updateHistory(event: IEvent<IExample>, ctx: Log) {
    this.loggerService.log(JSON.stringify(event, null, "\t"), ExampleServiceWs.name);

    const { name, args } = event;
    const { address, transactionHash } = ctx;

    return await this.erc721MarketplaceHistoryService.create({
      address: address.toLowerCase(),
      transactionHash: transactionHash.toLowerCase(),
      eventType: name,
      eventData: args,
    });
  }
}
*/
