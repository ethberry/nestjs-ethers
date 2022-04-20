import { Logger, Module } from "@nestjs/common";
import { DiscoveryModule } from "@golevelup/nestjs-discovery";
import { ConfigModule } from "@nestjs/config";

import { LicenseModule, licenseProvider } from "@gemunion/nest-js-module-license";

import { ethersWsProvider } from "./providers";
import { EthersContractService } from "./ethers.contract.service";

@Module({
  imports: [ConfigModule, DiscoveryModule, LicenseModule.deferred()],
  providers: [ethersWsProvider, licenseProvider, Logger, EthersContractService],
  exports: [EthersContractService],
})
export class EthersContractModule {}
