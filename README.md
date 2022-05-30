# NestJS Ethers Transport

### Private test blockchain

To setup Besu

```sh
docker run -p 8546:8546 -p 8545:8545 --mount type=bind,source=$PWD/besu,target=/var/lib/besu hyperledger/besu:latest --miner-enabled --miner-coinbase fe3b557e8fb62b89f4916b721be55ceb828dbd73 --rpc-ws-enabled --rpc-http-enabled --rpc-http-cors-origins=all --network=dev --data-path=/var/lib/besu
```

Explorer (port 8080)
```shell
docker run -p 8080:80 -e APP_NODE_URL=http://localhost:8545 alethio/ethereum-lite-explorer
```
How to use:

```code
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
```