import { ConfigService } from "@nestjs/config";

import { JsonRpcProvider, Network } from "ethers";
import { testChainId } from "@gemunion/constants";

import { ETHERS_RPC } from "../ethers.constants";

export const ethersRpcProvider = {
  provide: ETHERS_RPC,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): JsonRpcProvider => {
    const rpcUrl = configService.get<string>("JSON_RPC_ADDR", "http://127.0.0.1:8545/");
    const chainId = configService.get<number>("CHAIN_ID", testChainId);
    const network = new Network("Network", chainId);
    return new JsonRpcProvider(rpcUrl, network, { staticNetwork: network, batchMaxCount: 1 });
  },
};
