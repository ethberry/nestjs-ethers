import { DynamicModule, Logger, Module, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { createConfigurableDynamicRootModule } from "@golevelup/nestjs-modules";
import { DiscoveryModule } from "@golevelup/nestjs-discovery";

import { LicenseModule, licenseProvider } from "@gemunion/nest-js-module-license";

import { ethersRpcProvider } from "./providers";
import { EthersContractService } from "./ethers.contract.service";
import { IModuleOptions } from "./interfaces";
import { MODULE_OPTIONS_PROVIDER } from "./ethers.constants";

@Module({
  imports: [ConfigModule, DiscoveryModule, ScheduleModule.forRoot(), LicenseModule.deferred()],
  providers: [ethersRpcProvider, licenseProvider, Logger, EthersContractService],
  exports: [EthersContractService],
})
export class EthersContractModule
  extends createConfigurableDynamicRootModule<EthersContractModule, IModuleOptions>(MODULE_OPTIONS_PROVIDER)
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly ethersContractService: EthersContractService) {
    super();
  }

  static deferred = (): Promise<DynamicModule> => EthersContractModule.externallyConfigured(EthersContractModule, 0);

  public async onModuleInit(): Promise<void> {
    return this.ethersContractService.init();
  }

  public async onModuleDestroy(): Promise<void> {
    return await this.ethersContractService.destroy();
  }
}
