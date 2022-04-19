import { Logger, Module } from "@nestjs/common";
import { DiscoveryModule } from "@golevelup/nestjs-discovery";
import { ConfigModule } from "@nestjs/config";

import { ethersRpcProvider, ethersSignerProvider, ethersWsProvider } from "./providers";
import { EthersContractService } from "./ethers.contract.service";

@Module({
  imports: [ConfigModule, DiscoveryModule],
  providers: [ethersRpcProvider, ethersSignerProvider, ethersWsProvider, Logger, EthersContractService],
  controllers: [],
  exports: [EthersContractService],
})
export class EthersContractModule {}
