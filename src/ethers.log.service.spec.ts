import { Controller, Injectable, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { Ctx, EventPattern, Payload } from "@nestjs/microservices";
import { ethers, providers, Wallet } from "ethers";
import { Log } from "@ethersproject/abstract-provider";

import { EthersContractModule } from "./ethers.contract.module";
import { EthersContractService } from "./ethers.contract.service";
import { ILogEvent, IModuleOptions } from "./interfaces";
import { LicenseModule } from "@gemunion/nest-js-module-license";
import process from "process";

import Erc721Contract from "./interfaces/abi/ERC721Simple.json";

interface IEvent {
  addr: string;
  beneficiary: string;
  startTimestamp: string;
  duration: string;
  templateId: string;
}

@Injectable()
class TestEthersContractService {
  constructor(private readonly ethersContractService: EthersContractService) {}

  public async logEvent(event: ILogEvent<IEvent>, ctx: Log): Promise<void> {
    console.info("event", event);
    console.info("ctx", ctx);
    await Promise.resolve(event);
  }
}

@Controller()
class TestEthersContractController {
  constructor(private readonly ethersContractService: TestEthersContractService) {}

  @EventPattern({
    contractType: "TEST_CONTRACT",
    eventName: "RoleAdminChanged",
  })
  public logEvent(@Payload() event: ILogEvent<IEvent>, @Ctx() ctx: Log): Promise<void> {
    return this.ethersContractService.logEvent(event, ctx);
  }
}

@Module({
  imports: [
    EthersContractModule.forRootAsync(EthersContractModule, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<IModuleOptions> => {
        const provider = new providers.JsonRpcProvider("http://127.0.0.1:8545/");
        const wallet = new Wallet("8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63", provider);
        const factory = new ethers.ContractFactory(Erc721Contract.abi, Erc721Contract.bytecode, wallet);
        const contract = await factory.deploy("name", "symbol", 0, "http://localhost/");
        await contract.deployed();
        console.info("contract deployed", contract.address);

        const fromBlock = ~~configService.get<string>("STARTING_BLOCK", "0");
        return {
          contract: {
            contractType: "TEST_CONTRACT",
            contractAddress: [contract.address],
            contractInterface: Erc721Contract.abi,
            // prettier-ignore
            eventNames: [
              "RoleAdminChanged",
            ],
          },
          block: {
            fromBlock,
            debug: true,
          },
        };
      },
    }),
  ],
  controllers: [TestEthersContractController],
  providers: [TestEthersContractService],
})
class TestEthersContractModule {}

describe("EthersServer", () => {
  let ethersTestContractService: TestEthersContractService;
  let logSpyContract: jest.SpyInstance;

  beforeEach(() => {
    logSpyContract = jest.spyOn(ethersTestContractService, "logEvent");
  });

  afterEach(() => {
    logSpyContract.mockClear();
  });

  // https://github.com/facebook/jest/issues/11543
  jest.setTimeout(60000);

  describe("ContractLog", () => {
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
              return configService.get<string>("GEMUNION_API_KEY", process.env.GEMUNION_API_KEY);
            },
          }),
          TestEthersContractModule,
        ],
      }).compile();
      ethersTestContractService = module.get<TestEthersContractService>(TestEthersContractService);
    });

    afterAll(async () => {});

    it("should receive Event", async () => {
      await new Promise(resolve => setTimeout(resolve, 15000));
      // expect(logSpyBlock).toBeCalledTimes(0);
      expect(logSpyContract).toBeCalled();
    });
  });
});
