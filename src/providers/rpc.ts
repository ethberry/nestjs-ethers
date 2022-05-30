import { Logger, LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { ethers } from "ethers";

import { ETHERS_RPC } from "../ethers.constants";

export const ethersRpcProvider = {
  provide: ETHERS_RPC,
  inject: [ConfigService, Logger],
  useFactory: (configService: ConfigService, loggerService: LoggerService): ethers.providers.JsonRpcProvider => {
    const rpcUrl = configService.get<string>("JSON_RPC_ADDR", "http://127.0.0.1:8545/");

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    provider.on("error", (e: Error) => {
      loggerService.error(e.message, e.stack, "EthersRpcProvider");
    });

    return provider;
  },
};
