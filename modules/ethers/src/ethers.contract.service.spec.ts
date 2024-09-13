import { Controller, Injectable, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { Ctx, EventPattern, Payload } from "@nestjs/microservices";
import { CronExpression } from "@nestjs/schedule";
import { BaseContract, ContractFactory, Interface, JsonRpcProvider, Wallet } from "ethers";
import { config } from "dotenv";

import { LicenseModule } from "@gemunion/nest-js-module-license";
import { delay } from "@gemunion/utils";

import type { IContractOptions, ILogEvent, ILogWithIndex, IModuleOptions } from "./interfaces";
import { EthersContractModule } from "./ethers.contract.module";
import { EthersContractService } from "./ethers.contract.service";
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

interface IExchange extends BaseContract {
  swap: (
    item: {
      account: string;
      token: string;
      tokenId: bigint;
    },
    price: {
      account: string;
      token: string;
      amount: bigint;
    },
  ) => Promise<any>;
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

interface IExchangeSwapEvent {
  success: string;
}

export enum ContractType {
  EXCHANGE = "EXCHANGE",
  ERC20_TOKEN = "ERC20_TOKEN",
  ERC721_TOKEN = "ERC721_TOKEN",
}

config();

const AMOUNT = 10000000n;
const TOKENID = 1n;

@Injectable()
class TestEthersContractService {
  constructor(private readonly ethersContractService: EthersContractService) {}

  public updateListener(contract: IContractOptions): void {
    return this.ethersContractService.updateListener(contract);
  }

  public async logEvent(
    event: ILogEvent<
      IERC20ApprovalEvent | IERC20TransferEvent | IERC721ApprovalEvent | IERC721TransferEvent | IExchangeSwapEvent
    >,
    ctx: ILogWithIndex,
  ): Promise<void> {
    // console.info("event", event.name);
    // console.info("ctx", ctx);
    // console.info(
    //   parseInt(ctx.blockNumber.toString(), 16),
    //   parseInt(ctx.transactionIndex.toString(), 16),
    //   parseInt(ctx.logIndex.toString(), 16),
    // );
    await Promise.resolve({ event, ctx });
  }
}

@Controller()
class TestEthersContractController {
  constructor(private readonly testEthersContractService: TestEthersContractService) {}

  @EventPattern({
    contractType: ContractType.ERC20_TOKEN,
    eventName: "Approval",
  })
  public logEvent1(@Payload() event: ILogEvent<IERC20ApprovalEvent>, @Ctx() ctx: ILogWithIndex): Promise<void> {
    return this.testEthersContractService.logEvent(event, ctx);
  }

  @EventPattern({
    contractType: ContractType.ERC20_TOKEN,
    eventName: "Transfer",
  })
  public logEvent2(@Payload() event: ILogEvent<IERC20TransferEvent>, @Ctx() ctx: ILogWithIndex): Promise<void> {
    return this.testEthersContractService.logEvent(event, ctx);
  }

  @EventPattern({
    contractType: ContractType.ERC721_TOKEN,
    eventName: "Approval",
  })
  public logEvent3(@Payload() event: ILogEvent<IERC721ApprovalEvent>, @Ctx() ctx: ILogWithIndex): Promise<void> {
    return this.testEthersContractService.logEvent(event, ctx);
  }

  @EventPattern({
    contractType: ContractType.ERC721_TOKEN,
    eventName: "Transfer",
  })
  public logEvent4(@Payload() event: ILogEvent<IERC721TransferEvent>, @Ctx() ctx: ILogWithIndex): Promise<void> {
    return this.testEthersContractService.logEvent(event, ctx);
  }

  @EventPattern({
    contractType: ContractType.EXCHANGE,
    eventName: "Swap",
  })
  public logEvent5(@Payload() event: ILogEvent<IExchangeSwapEvent>, @Ctx() ctx: ILogWithIndex): Promise<void> {
    return this.testEthersContractService.logEvent(event, ctx);
  }

  @EventPattern({
    contractType: ContractType.EXCHANGE,
    eventName: "Swap",
  })
  public logEvent6(@Payload() event: ILogEvent<IExchangeSwapEvent>, @Ctx() ctx: ILogWithIndex): Promise<void> {
    return this.testEthersContractService.logEvent(event, ctx);
  }
}

@Module({
  imports: [EthersContractModule.deferred()],
  providers: [TestEthersContractService],
  controllers: [TestEthersContractController],
  exports: [TestEthersContractService],
})
class TestEthersContractModule {}

describe("EthersServer", () => {
  // https://github.com/facebook/jest/issues/11543
  jest.setTimeout(60000);

  let logSpyContract: jest.SpyInstance;

  let testEthersContractService: TestEthersContractService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: `.env`,
        }),
        LicenseModule.forRootAsync(LicenseModule, {
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService): string => {
            return configService.get<string>("GEMUNION_API_KEY", process.env.GEMUNION_API_KEY);
          },
        }),
        EthersContractModule.forRootAsync(EthersContractModule, {
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService): Promise<IModuleOptions> => {
            const fromBlock = ~~configService.get<string>("STARTING_BLOCK", "0");
            return Promise.resolve({
              fromBlock,
              debug: true,
              cron: CronExpression.EVERY_5_SECONDS,
            });
          },
        }),
        TestEthersContractModule,
      ],
    }).compile();

    testEthersContractService = module.get<TestEthersContractService>(TestEthersContractService);
    logSpyContract = jest.spyOn(testEthersContractService, "logEvent");

    await module.init();
  });

  afterEach(() => {
    logSpyContract.mockClear();
  });

  it("should receive Event", async () => {
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

    const tx3 = await itemContract.mint(process.env.ACCOUNT, TOKENID);
    await tx3.wait();
    const tx4 = await itemContract.approve(await exchangeContract.getAddress(), TOKENID);
    await tx4.wait();

    const tx5 = await exchangeContract.swap(
      {
        account: process.env.ACCOUNT,
        token: await itemContract.getAddress(),
        tokenId: TOKENID,
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
      eventNames: ["Transfer", "Approval"],
    });
    testEthersContractService.updateListener({
      contractType: ContractType.ERC721_TOKEN,
      contractAddress: [await itemContract.getAddress()],
      contractInterface: new Interface(Erc721Contract.abi),
      eventNames: ["Transfer", "Approval"],
    });
    testEthersContractService.updateListener({
      contractType: ContractType.EXCHANGE,
      contractAddress: [await exchangeContract.getAddress()],
      contractInterface: new Interface(ExchangeContract.abi),
      eventNames: ["Swap"],
    });

    await delay(10000); // this depends on amount of blocks in blockchain

    expect(logSpyContract).toBeCalledTimes(8);
  });
});
