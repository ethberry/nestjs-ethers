import { Injectable } from "@nestjs/common";
import { Interface } from "@ethersproject/abi";

import { IContractOptions } from "./interfaces";
import { EthersAbstractService } from "./ethers.abstract.service";
import { getPastEvents, parseLog } from "./utils/utils";

@Injectable()
export class EthersContractService extends EthersAbstractService {
  private latency: number;

  public async listen(contractOptions: Array<IContractOptions>): Promise<void> {
    this.latency = ~~this.configService.get<string>("LATENCY", "32");

    let fromBlockNumber = ~~this.configService.get<string>("STARTING_BLOCK", "0");
    let toBlockNumber = await this.provider.getBlockNumber();

    // check all past events
    await this.init(contractOptions, fromBlockNumber, toBlockNumber);

    // then check new events once in a while
    setTimeout(async () => {
      fromBlockNumber = toBlockNumber;
      toBlockNumber = await this.provider.getBlockNumber();
      await this.init(contractOptions, fromBlockNumber, toBlockNumber);
    }, 300 * 1000);
  }

  public async init(
    contractOptions: Array<IContractOptions>,
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<void> {
    await Promise.all(
      contractOptions.map(async contractOption => {
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
