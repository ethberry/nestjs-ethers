import { Controller, INestApplication, Injectable, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { EventPattern, Payload } from "@nestjs/microservices";
import { Block, TransactionResponse } from "@ethersproject/abstract-provider";

import { ethers } from "ethers";
import { WebSocketProvider } from "@ethersproject/providers";

import { EthersTransactionServer } from "./transaction.server";
import { EventTypes } from "./interfaces";

@Injectable()
class EthersTransactionService {
  public async block(block: Block): Promise<void> {
    await Promise.resolve(block);
  }

  public async transaction(transaction: TransactionResponse): Promise<void> {
    await Promise.resolve(transaction);
  }
}

@Controller()
class EthersTransactionController {
  constructor(private readonly ethersTransactionService: EthersTransactionService) {}

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
  controllers: [EthersTransactionController],
  providers: [EthersTransactionService],
})
class EthersTransactionModule {}

describe.only("EthersServer", () => {
  let app: INestApplication;
  let ethersTransactionService: EthersTransactionService;
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
      const module: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule.forRoot(), EthersTransactionModule],
      }).compile();
      app = module.createNestApplication();
      const configService = app.get(ConfigService);
      const wsUrl = configService.get<string>("WEBSOCKET_ADDR", "ws://127.0.0.1:8546/");
      app.connectMicroservice({
        strategy: new EthersTransactionServer({
          url: wsUrl,
          eventNames: [EventTypes.BLOCK],
        }),
      });
      await app.startAllMicroservices();
      ethersTransactionService = module.get<EthersTransactionService>(EthersTransactionService);
    });

    afterAll(async () => {
      await app.close();
    });

    it("should receive Block", async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      expect(logSpyBlock).toBeCalled();
      expect(logSpyTransaction).toBeCalledTimes(0);
    });
  });

  describe("Transaction", () => {
    beforeAll(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule.forRoot(), EthersTransactionModule],
      }).compile();
      app = module.createNestApplication();
      const configService = app.get(ConfigService);
      const wsUrl = configService.get<string>("WEBSOCKET_ADDR", "ws://127.0.0.1:8546/");
      app.connectMicroservice({
        strategy: new EthersTransactionServer({
          url: wsUrl,
          eventNames: [EventTypes.TRANSACTION],
        }),
      });
      await app.startAllMicroservices();
      ethersTransactionService = module.get<EthersTransactionService>(EthersTransactionService);
    });

    afterAll(async () => {
      await app.close();
    });

    it("should receive Transaction", async () => {
      const provider = new ethers.providers.JsonRpcProvider(
        process.env.RPC_ADDR ? process.env.RPC_ADDR : "http://127.0.0.1:8545/",
      );
      const wallet = new ethers.Wallet("0x8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63");

      await wallet.connect(provider).sendTransaction({
        to: "0x61284003E50b2D7cA2B95F93857abB78a1b0F3Ca",
        value: ethers.utils.parseEther("0.01"),
      });
      await new Promise(resolve => setTimeout(resolve, 5000));
      expect(logSpyBlock).toBeCalledTimes(0);
      expect(logSpyTransaction).toBeCalled();
    });
  });

  describe("Block & Transaction", () => {
    beforeAll(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule.forRoot(), EthersTransactionModule],
      }).compile();
      app = module.createNestApplication();
      const configService = app.get(ConfigService);
      const wsUrl = configService.get<string>("WEBSOCKET_ADDR", "ws://127.0.0.1:8546/");
      app.connectMicroservice({
        strategy: new EthersTransactionServer({
          url: wsUrl,
          eventNames: [EventTypes.BLOCK, EventTypes.TRANSACTION],
        }),
      });
      await app.startAllMicroservices();
      ethersTransactionService = module.get<EthersTransactionService>(EthersTransactionService);
    });

    afterAll(async () => {
      await app.close();
    });

    it("should receive Block & Transaction", async () => {
      const provider = new ethers.providers.JsonRpcProvider(
        process.env.RPC_ADDR ? process.env.RPC_ADDR : "http://127.0.0.1:8545/",
      );
      const wallet = new ethers.Wallet("0x8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63");

      await wallet.connect(provider).sendTransaction({
        to: "0x61284003E50b2D7cA2B95F93857abB78a1b0F3Ca",
        value: ethers.utils.parseEther("0.01"),
      });
      await new Promise(resolve => setTimeout(resolve, 5000));
      expect(logSpyBlock).toBeCalled();
      expect(logSpyTransaction).toBeCalled();
    });
  });
});
