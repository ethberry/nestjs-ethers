import { Inject, Logger, Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { createConfigurableDynamicRootModule } from "@golevelup/nestjs-modules";
import { DiscoveryModule } from "@golevelup/nestjs-discovery";
import { providers } from "ethers";

import { LicenseModule, licenseProvider } from "@gemunion/nest-js-module-license";

import { ethersWsProvider } from "./providers";
import { EthersContractService } from "./ethers.contract.service";
import { IContractOptions } from "./interfaces";
import { CONTRACT_OPTIONS_PROVIDER, ETHERS_WS } from "./ethers.constants";

@Module({
  imports: [ConfigModule, DiscoveryModule, ScheduleModule.forRoot(), LicenseModule.deferred()],
  providers: [ethersWsProvider, licenseProvider, Logger, EthersContractService],
  exports: [EthersContractService],
})
export class EthersContractModule {}

@Module({
  imports: [ConfigModule, DiscoveryModule, ScheduleModule.forRoot(), LicenseModule.deferred()],
  providers: [ethersWsProvider, licenseProvider, Logger, EthersContractService],
  exports: [EthersContractService],
})
export class TestModule
  extends createConfigurableDynamicRootModule<TestModule, Array<IContractOptions>>(CONTRACT_OPTIONS_PROVIDER)
  implements OnModuleInit
{
  constructor(
    @Inject(ETHERS_WS)
    protected readonly provider: providers.WebSocketProvider,
    private readonly ethersContractService: EthersContractService,
  ) {
    super();
  }

  public async onModuleInit(): Promise<void> {
    return this.ethersContractService.init();
  }
}
