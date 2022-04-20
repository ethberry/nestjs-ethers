import { Logger, Module } from "@nestjs/common";
import { DiscoveryModule } from "@golevelup/nestjs-discovery";
import { ConfigModule } from "@nestjs/config";

import { LicenseModule, licenseProvider } from "@gemunion/nest-js-module-license";

import { ethersWsProvider } from "./providers";
import { EthersTransactionService } from "./ethers.transaction.service";

@Module({
  imports: [ConfigModule, DiscoveryModule, LicenseModule.deferred()],
  providers: [ethersWsProvider, licenseProvider, Logger, EthersTransactionService],
  exports: [EthersTransactionService],
})
export class EthersTransactionModule {}
