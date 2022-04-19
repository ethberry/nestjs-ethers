import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";

import { ETHERS_RPC } from "../ethers.constants";

export const ethersRpcProvider = {
  provide: ETHERS_RPC,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): ethers.providers.JsonRpcProvider => {
    const rpcUrl = configService.get<string>("JSON_RPC_ADDR", "http://127.0.0.1:8545/");

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    return provider;
  },
};
