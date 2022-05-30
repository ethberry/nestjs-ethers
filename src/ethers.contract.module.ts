import { Logger, Module, OnModuleInit } from "@nestjs/common";
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
  implements OnModuleInit
{
  constructor(private readonly ethersContractService: EthersContractService) {
    super();
  }

  public async onModuleInit(): Promise<void> {
    return this.ethersContractService.init();
  }
}
