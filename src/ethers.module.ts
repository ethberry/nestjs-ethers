import { DynamicModule, Logger, Module, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { createConfigurableDynamicRootModule } from "@golevelup/nestjs-modules";
import { DiscoveryModule } from "@golevelup/nestjs-discovery";

import { ethersRpcProvider } from "./providers";
import { EthersService } from "./ethers.service";
import { IModuleOptions } from "./interfaces";
import { MODULE_OPTIONS_PROVIDER } from "./ethers.constants";

@Module({
  imports: [ConfigModule, DiscoveryModule, ScheduleModule.forRoot()],
  providers: [ethersRpcProvider, Logger, EthersService],
  exports: [EthersService],
})
export class EthersModule
  extends createConfigurableDynamicRootModule<EthersModule, IModuleOptions>(MODULE_OPTIONS_PROVIDER)
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly ethersContractService: EthersService) {
    super();
  }

  static deferred = (): Promise<DynamicModule> => EthersModule.externallyConfigured(EthersModule, 0);

  public onModuleInit(): void {
    return this.ethersContractService.init();
  }

  public onModuleDestroy(): void {
    return this.ethersContractService.destroy();
  }
}
