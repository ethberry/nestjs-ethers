import { Controller, Injectable, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { Ctx, EventPattern, Payload } from "@nestjs/microservices";
import { CronExpression } from "@nestjs/schedule";
import { BaseContract, ContractFactory, Interface, JsonRpcProvider, Wallet, Log } from "ethers";
import { config } from "dotenv";

import { patchBigInt } from "./utils/patch-bigint";
import { waitForConfirmation } from "./utils/block-await";
import type { IContractOptions, ILogEvent, IModuleOptions } from "./interfaces";
import { EthersModule } from "./ethers.module";
import { EthersService } from "./ethers.service";

import Erc20Contract from "./contracts/ERC20Ownable.json";
import Erc721Contract from "./contracts/ERC721Ownable.json";
import ExchangeContract from "./contracts/Exchange.json";

interface IERC20 extends BaseContract {
  mint: (to: string, amount: bigint) => Promise<any>;
  approve: (spender: string, value: bigint) => Promise<any>;
  transferFrom: (from: string, to: string, value: bigint) => Promise<any>;
}

interface IERC721 extends BaseContract {
  mint: (to: string, tokenId: bigint) => Promise<any>;
  approve: (to: string, tokenId: bigint) => Promise<any>;
  transferFrom: (from: string, to: string, tokenId: bigint) => Promise<any>;
}

interface IExchangeItem {
  account: string;
  token: string;
  tokenId: bigint;
}

interface IExchangePrice {
  account: string;
  token: string;
  amount: bigint;
}

interface IExchange extends BaseContract {
  swap: (item: IExchangeItem, price: IExchangePrice) => Promise<any>;
}

interface IERC20ApprovalEvent {
  owner: string;
  spender: string;
  value: string;
}

interface IERC20TransferEvent {
  from: string;
  to: string;
  value: string;
}

interface IERC721ApprovalEvent {
  owner: string;
  to: string;
  tokenId: string;
}

interface IERC721TransferEvent {
  from: string;
  to: string;
  tokenId: string;
}

interface IOwnershipTransferred {
  previousOwner: string;
  newOwner: string;
}

interface IExchangeSwapEvent {
  item: IExchangeItem;
  price: IExchangePrice;
}

export enum ContractType {
  EXCHANGE = "EXCHANGE",
  ERC20_TOKEN = "ERC20_TOKEN",
  ERC721_TOKEN = "ERC721_TOKEN",
}

config();
patchBigInt();

const AMOUNT = 10000000n;
const TOKEN_ID = 1n;

@Injectable()
class TestEthersService {
  constructor(private readonly ethersContractService: EthersService) {}

  public updateListener(contract: IContractOptions): void {
    return this.ethersContractService.updateRegistry(contract);
  }

  public getRegistry(): Array<IContractOptions> {
    return this.ethersContractService.getRegistry();
  }

  public async logEvent(
    event: ILogEvent<
      | IERC20ApprovalEvent
      | IERC20TransferEvent
      | IERC721ApprovalEvent
      | IERC721TransferEvent
      | IOwnershipTransferred
      | IExchangeSwapEvent
    >,
    ctx: Log,
  ): Promise<void> {
    // console.info("event", event.name);
    // console.info("args", JSON.stringify(event.args));
    // console.info("ctx", ctx);
    // console.info(
    //   parseInt(ctx.blockNumber.toString(), 16),
    //   parseInt(ctx.transactionIndex.toString(), 16),
    //   parseInt(ctx.logIndex.toString(), 16), // logIndex is not present in ethers types
    // );
    await Promise.resolve({ event, ctx });
  }
}

@Controller()
class TestEthersController {
  constructor(private readonly testEthersService: TestEthersService) {}

  @EventPattern([
    {
      contractType: ContractType.ERC20_TOKEN,
      eventName: "OwnershipTransferred",
    },
    {
      contractType: ContractType.ERC721_TOKEN,
      eventName: "OwnershipTransferred",
    },
  ])
  public logEvent1(@Payload() event: ILogEvent<IOwnershipTransferred>, @Ctx() ctx: Log): Promise<void> {
    return this.testEthersService.logEvent(event, ctx);
  }

  @EventPattern({
    contractType: ContractType.ERC20_TOKEN,
    eventName: "Approval",
  })
  public logEvent2(@Payload() event: ILogEvent<IERC20ApprovalEvent>, @Ctx() ctx: Log): Promise<void> {
    return this.testEthersService.logEvent(event, ctx);
  }

  @EventPattern({
    contractType: ContractType.ERC20_TOKEN,
    eventName: "Transfer",
  })
  public logEvent3(@Payload() event: ILogEvent<IERC20TransferEvent>, @Ctx() ctx: Log): Promise<void> {
    return this.testEthersService.logEvent(event, ctx);
  }

  @EventPattern({
    contractType: ContractType.ERC721_TOKEN,
    eventName: "Approval",
  })
  public logEvent4(@Payload() event: ILogEvent<IERC721ApprovalEvent>, @Ctx() ctx: Log): Promise<void> {
    return this.testEthersService.logEvent(event, ctx);
  }

  @EventPattern({
    contractType: ContractType.ERC721_TOKEN,
    eventName: "Transfer",
  })
  public logEvent5(@Payload() event: ILogEvent<IERC721TransferEvent>, @Ctx() ctx: Log): Promise<void> {
    return this.testEthersService.logEvent(event, ctx);
  }

  @EventPattern({
    contractType: ContractType.EXCHANGE,
    eventName: "Swap",
  })
  public logEvent6(@Payload() event: ILogEvent<IExchangeSwapEvent>, @Ctx() ctx: Log): Promise<void> {
    return this.testEthersService.logEvent(event, ctx);
  }

  @EventPattern({
    contractType: ContractType.EXCHANGE,
    eventName: "Swap",
  })
  public logEvent7(@Payload() event: ILogEvent<IExchangeSwapEvent>, @Ctx() ctx: Log): Promise<void> {
    return this.testEthersService.logEvent(event, ctx);
  }
}

@Module({
  imports: [EthersModule.deferred()],
  providers: [TestEthersService],
  controllers: [TestEthersController],
  exports: [TestEthersService],
})
class TestEthersModule {}

describe("EthersServer", function() {
  // https://github.com/facebook/jest/issues/11543
  jest.setTimeout(100000);

  let logSpyContract: jest.SpyInstance;

  let testEthersContractService: TestEthersService;

  beforeEach(async function() {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: `.env`,
        }),
        EthersModule.forRootAsync(EthersModule, {
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService): Promise<IModuleOptions> => {
            const latency = ~~configService.get<string>("LATENCY", "1");
            const fromBlock = ~~configService.get<string>("STARTING_BLOCK", "0");
            return Promise.resolve({
              latency,
              fromBlock,
              toBlock: Number.NaN,
              debug: true,
              cron: CronExpression.EVERY_5_SECONDS,
            });
          },
        }),
        TestEthersModule,
      ],
    }).compile();

    testEthersContractService = module.get<TestEthersService>(TestEthersService);
    logSpyContract = jest.spyOn(testEthersContractService, "logEvent");

    await module.init();
  });

  afterEach(function() {
    logSpyContract.mockClear();
  });

  it("should receive Event", async function() {
    const provider = new JsonRpcProvider(process.env.JSON_RPC_ADDR);
    const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

    const exchangeFactory = new ContractFactory<Array<any>, IExchange>(
      ExchangeContract.abi,
      ExchangeContract.bytecode,
      wallet,
    );
    const exchangeContract = await exchangeFactory.deploy();
    await exchangeContract.waitForDeployment();

    const priceFactory = new ContractFactory<Array<any>, IERC20>(Erc20Contract.abi, Erc20Contract.bytecode, wallet);
    const priceContract = await priceFactory.deploy("name", "symbol");
    await priceContract.waitForDeployment();

    const tx1 = await priceContract.mint(process.env.ACCOUNT, AMOUNT);
    await tx1.wait();
    const tx2 = await priceContract.approve(await exchangeContract.getAddress(), AMOUNT);
    await tx2.wait();

    const itemFactory = new ContractFactory<Array<any>, IERC721>(Erc721Contract.abi, Erc721Contract.bytecode, wallet);
    const itemContract = await itemFactory.deploy("name", "symbol");
    await itemContract.waitForDeployment();

    const tx3 = await itemContract.mint(process.env.ACCOUNT, TOKEN_ID);
    await tx3.wait();
    const tx4 = await itemContract.approve(await exchangeContract.getAddress(), TOKEN_ID);
    await tx4.wait();

    const tx5 = await exchangeContract.swap(
      {
        account: process.env.ACCOUNT,
        token: await itemContract.getAddress(),
        tokenId: TOKEN_ID,
      },
      {
        account: process.env.ACCOUNT,
        token: await priceContract.getAddress(),
        amount: AMOUNT,
      },
    );
    await tx5.wait();

    testEthersContractService.updateListener({
      contractType: ContractType.ERC20_TOKEN,
      contractAddress: [await priceContract.getAddress()],
      contractInterface: new Interface(Erc20Contract.abi),
      eventSignatures: [
        "Transfer(address,address,uint256)",
        "Approval(address,address,uint256)",
        "OwnershipTransferred(address,address)",
      ],
    });
    testEthersContractService.updateListener({
      contractType: ContractType.ERC721_TOKEN,
      contractAddress: [await itemContract.getAddress()],
      contractInterface: new Interface(Erc721Contract.abi),
      eventSignatures: [
        "Transfer(address,address,uint256)",
        "Approval(address,address,uint256)",
        "OwnershipTransferred(address,address)",
      ],
    });
    testEthersContractService.updateListener({
      contractType: ContractType.EXCHANGE,
      contractAddress: [await exchangeContract.getAddress()],
      contractInterface: new Interface(ExchangeContract.abi),
      eventSignatures: ["Swap((address,address,uint256),(address,address,uint256))"],
    });

    await waitForConfirmation(provider, ~~process.env.LATENCY);

    expect(logSpyContract).toBeCalledTimes(10);
  });
});
