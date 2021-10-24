import { Controller, INestApplication, Injectable, Module } from "@nestjs/common";
import { ConfigService, ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { EventPattern, Payload } from "@nestjs/microservices";
import { Block, TransactionResponse } from "@ethersproject/abstract-provider";

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

  @EventPattern(EventTypes.BLOCK)
  public block(@Payload() data: Block): Promise<void> {
    return this.ethersTransactionService.block(data);
  }

  @EventPattern(EventTypes.TRANSACTION)
  public transaction(@Payload() data: TransactionResponse): Promise<void> {
    return this.ethersTransactionService.transaction(data);
  }
}

@Module({
  controllers: [EthersTransactionController],
  providers: [EthersTransactionService],
})
class EthersTransactionModule {}

describe("EthersServer", () => {
  let app: INestApplication;
  let ethersTransactionService: EthersTransactionService;
  let logSpyBlock: jest.SpyInstance;
  let logSpyTransaction: jest.SpyInstance;

  beforeEach(() => {
    logSpyBlock = jest.spyOn(ethersTransactionService, "block");
    logSpyTransaction = jest.spyOn(ethersTransactionService, "transaction");
  });

  afterEach(() => {
    logSpyBlock.mockClear();
    logSpyTransaction.mockClear();
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
          events: [EventTypes.BLOCK],
        }),
      });
      await app.startAllMicroservices();
      ethersTransactionService = module.get<EthersTransactionService>(EthersTransactionService);
    });

    afterAll(async () => {
      await app.close();
    });

    it("should receive Block", async () => {
      await new Promise(resolve => setTimeout(resolve, 60000));
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
          events: [EventTypes.TRANSACTION],
        }),
      });
      await app.startAllMicroservices();
      ethersTransactionService = module.get<EthersTransactionService>(EthersTransactionService);
    });

    afterAll(async () => {
      await app.close();
    });

    it("should receive Transaction", async () => {
      await new Promise(resolve => setTimeout(resolve, 60000));
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
          events: [EventTypes.BLOCK, EventTypes.TRANSACTION],
        }),
      });
      await app.startAllMicroservices();
      ethersTransactionService = module.get<EthersTransactionService>(EthersTransactionService);
    });

    afterAll(async () => {
      await app.close();
    });

    it("should receive Block & Transaction", async () => {
      await new Promise(resolve => setTimeout(resolve, 60000));
      expect(logSpyBlock).toBeCalled();
      expect(logSpyTransaction).toBeCalled();
    });
  });
});
