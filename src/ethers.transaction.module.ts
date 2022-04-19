import { Logger, Module } from "@nestjs/common";
import { DiscoveryModule } from "@golevelup/nestjs-discovery";
import { ConfigModule } from "@nestjs/config";

import { ethersRpcProvider, ethersSignerProvider, ethersWsProvider } from "./providers";
import { EthersTransactionService } from "./ethers.transaction.service";

@Module({
  imports: [ConfigModule, DiscoveryModule],
  providers: [ethersRpcProvider, ethersSignerProvider, ethersWsProvider, Logger, EthersTransactionService],
  controllers: [],
  exports: [EthersTransactionService],
})
export class EthersTransactionModule {}
