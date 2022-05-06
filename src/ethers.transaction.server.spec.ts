import { Controller, Injectable, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { EventPattern, Payload } from "@nestjs/microservices";
import { ethers } from "ethers";
import { Block, TransactionResponse } from "@ethersproject/abstract-provider";
import { WebSocketProvider } from "@ethersproject/providers";

import { EthersTransactionModule } from "./ethers.transaction.module";
import { EthersTransactionService } from "./ethers.transaction.service";
import { EventTypes } from "./interfaces";
import { LicenseModule } from "@gemunion/nest-js-module-license";
import process from "process";

@Injectable()
class TestEthersTransactionService {
  constructor(private readonly ethersTransactionService: EthersTransactionService) {}

  public async block(block: Block): Promise<void> {
    await Promise.resolve(block);
  }

  public async transaction(transaction: TransactionResponse): Promise<void> {
    await Promise.resolve(transaction);
  }

  public async init(eventNames: Array<EventTypes>): Promise<void> {
    await this.ethersTransactionService.listen(eventNames);
  }
}

@Controller()
class TestEthersTransactionController {
  constructor(private readonly ethersTransactionService: TestEthersTransactionService) {}

  @EventPattern({ eventName: EventTypes.BLOCK })
  public block(@Payload() data: Block): Promise<void> {
    return this.ethersTransactionService.block(data);
  }

  @EventPattern({ eventName: EventTypes.TRANSACTION })
  public transaction(@Payload() data: TransactionResponse): Promise<void> {
    return this.ethersTransactionService.transaction(data);
  }
}

@Module({
  imports: [EthersTransactionModule],
  controllers: [TestEthersTransactionController],
  providers: [TestEthersTransactionService],
})
class TestEthersTransactionModule {}

describe("EthersServer", () => {
  let ethersTransactionService: TestEthersTransactionService;
  let logSpyBlock: jest.SpyInstance;
  let logSpyTransaction: jest.SpyInstance;

  let ethersWsProvider: WebSocketProvider;
  beforeEach(async () => {
    ethersWsProvider = new ethers.providers.WebSocketProvider(
      process.env.WEBSOCKET_ADDR ? process.env.WEBSOCKET_ADDR : "ws://127.0.0.1:8546/",
    );
    await ethersWsProvider.send("miner_start");
    logSpyBlock = jest.spyOn(ethersTransactionService, "block");
    logSpyTransaction = jest.spyOn(ethersTransactionService, "transaction");
  });

  afterEach(async () => {
    await ethersWsProvider.send("miner_stop");
    logSpyBlock.mockClear();
    logSpyTransaction.mockClear();
    await ethersWsProvider.destroy();
  });

  // https://github.com/facebook/jest/issues/11543
  jest.setTimeout(60000);

  describe("Block", () => {
    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            envFilePath: `.env`,
          }),
          LicenseModule.forRootAsync(LicenseModule, {
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService): string => {
              return configService.get<string>("GEMUNION_API_KEY", process.env.GEMUNION_API_KEY as string);
            },
          }),
          TestEthersTransactionModule,
        ],
      }).compile();

      ethersTransactionService = module.get<TestEthersTransactionService>(TestEthersTransactionService);
      await ethersTransactionService.init([EventTypes.BLOCK]);
    });

    afterAll(() => {});

    it("should receive Block", async () => {
      await new Promise(resolve => setTimeout(resolve, 15000));
      expect(logSpyBlock).toBeCalled();
      expect(logSpyTransaction).toBeCalledTimes(0);
    });
  });

  describe("Transaction", () => {
    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            envFilePath: `.env`,
          }),
          LicenseModule.forRootAsync(LicenseModule, {
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService): string => {
              return configService.get<string>("GEMUNION_API_KEY", process.env.GEMUNION_API_KEY as string);
            },
          }),
          TestEthersTransactionModule,
        ],
      }).compile();
      ethersTransactionService = module.get<TestEthersTransactionService>(TestEthersTransactionService);
      await ethersTransactionService.init([EventTypes.TRANSACTION]);
    });

    afterAll(async () => {});

    it("should receive Transaction", async () => {
      const provider = new ethers.providers.JsonRpcProvider(
        process.env.RPC_ADDR ? process.env.RPC_ADDR : "http://127.0.0.1:8545/",
      );
      const wallet = new ethers.Wallet("0x8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63");

      await wallet.connect(provider).sendTransaction({
        to: "0x61284003E50b2D7cA2B95F93857abB78a1b0F3Ca",
        value: ethers.utils.parseEther("0.01"),
      });
      await new Promise(resolve => setTimeout(resolve, 15000));
      expect(logSpyBlock).toBeCalledTimes(0);
      expect(logSpyTransaction).toBeCalled();
    });
  });

  describe("Block & Transaction", () => {
    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            envFilePath: `.env`,
          }),
          LicenseModule.forRootAsync(LicenseModule, {
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService): string => {
              return configService.get<string>("GEMUNION_API_KEY", process.env.GEMUNION_API_KEY as string);
            },
          }),
          TestEthersTransactionModule,
        ],
      }).compile();
      ethersTransactionService = module.get<TestEthersTransactionService>(TestEthersTransactionService);
      await ethersTransactionService.init([EventTypes.BLOCK, EventTypes.TRANSACTION]);
    });

    afterAll(async () => {});

    it("should receive Block & Transaction", async () => {
      const provider = new ethers.providers.JsonRpcProvider(
        process.env.RPC_ADDR ? process.env.RPC_ADDR : "http://127.0.0.1:8545/",
      );
      const wallet = new ethers.Wallet("0x8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63");

      await wallet.connect(provider).sendTransaction({
        to: "0x61284003E50b2D7cA2B95F93857abB78a1b0F3Ca",
        value: ethers.utils.parseEther("0.01"),
      });
      await new Promise(resolve => setTimeout(resolve, 15000));
      expect(logSpyBlock).toBeCalled();
      expect(logSpyTransaction).toBeCalled();
    });
  });
});
