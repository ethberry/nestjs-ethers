import { Controller, Injectable, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { Ctx, EventPattern, Payload } from "@nestjs/microservices";
import { ethers, providers, Wallet, Contract, constants } from "ethers";
import { Log } from "@ethersproject/abstract-provider";
import { JsonRpcProvider } from "@ethersproject/providers";
import { config } from "dotenv";

import { LicenseModule } from "@gemunion/nest-js-module-license";

import { EthersContractModule } from "./ethers.contract.module";
import { ILogEvent, IModuleOptions } from "./interfaces";
import Erc721Contract from "./interfaces/abi/ERC721Simple.json";

config();

@Injectable()
class TestEthersContractService {
  public async logEvent(event: ILogEvent, ctx: Log): Promise<void> {
    console.info("event", event);
    console.info("ctx", ctx);
    await Promise.resolve(event);
  }
}

@Controller()
class TestEthersContractController {
  constructor(private readonly testEthersContractService: TestEthersContractService) {}

  @EventPattern({
    contractType: "TEST_CONTRACT",
    eventName: "RoleRevoked",
  })
  public logEvent1(@Payload() event: ILogEvent, @Ctx() ctx: Log): Promise<void> {
    return this.testEthersContractService.logEvent(event, ctx);
  }

  @EventPattern({
    contractType: "TEST_CONTRACT",
    eventName: "RoleRevoked",
  })
  public logEvent2(@Payload() event: ILogEvent, @Ctx() ctx: Log): Promise<void> {
    return this.testEthersContractService.logEvent(event, ctx);
  }
}

@Module({
  providers: [TestEthersContractService],
  controllers: [TestEthersContractController],
  exports: [TestEthersContractService],
})
class TestEthersContractModule {}

describe.only("EthersServer", () => {
  let logSpyContract: jest.SpyInstance;
  let provider: JsonRpcProvider;
  let contract: Contract;

  // https://github.com/facebook/jest/issues/11543
  jest.setTimeout(10000);

  beforeAll(async () => {
    provider = new providers.JsonRpcProvider(process.env.JSON_RPC_ADDR);
    const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
    const factory = new ethers.ContractFactory(Erc721Contract.abi, Erc721Contract.bytecode, wallet);
    contract = await factory.deploy("name", "symbol", 0, "http://localhost/");
    await contract.deployed();
  });

  describe("ContractLog", () => {
    let testEthersContractService: TestEthersContractService;

    // https://github.com/facebook/jest/issues/11543
    // jest.setTimeout(60000);

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
            useFactory: (configService: ConfigService): IModuleOptions => {
              const fromBlock = ~~configService.get<string>("STARTING_BLOCK", "0");
              return {
                contract: {
                  contractType: "TEST_CONTRACT",
                  contractAddress: [contract.address],
                  contractInterface: Erc721Contract.abi,
                  // prettier-ignore
                  eventNames: [
                    "RoleRevoked",
                  ],
                },
                block: {
                  fromBlock,
                  debug: true,
                },
              };
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
      const tx = await contract.renounceRole(constants.HashZero, process.env.ACCOUNT);

      await tx.wait();

      await new Promise<void>(resolve => setTimeout(() => resolve(), 5000));

      expect(logSpyContract).toBeCalledTimes(2);
    });
  });
});
