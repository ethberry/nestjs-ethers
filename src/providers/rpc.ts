import { ConfigService } from "@nestjs/config";

import { JsonRpcProvider } from "ethers";

import { ETHERS_RPC } from "../ethers.constants";

export const ethersRpcProvider = {
  provide: ETHERS_RPC,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): JsonRpcProvider => {
    const rpcUrl = configService.get<string>("JSON_RPC_ADDR", "http://127.0.0.1:8545/");
    return new JsonRpcProvider(rpcUrl);
  },
};
