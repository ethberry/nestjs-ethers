import { ConfigService } from "@nestjs/config";
import { JsonRpcProvider, Wallet } from "ethers";

import { ETHERS_RPC, ETHERS_SIGNER } from "../ethers.constants";

export const ethersSignerProvider = {
  provide: ETHERS_SIGNER,
  inject: [ConfigService, ETHERS_RPC],
  useFactory: (configService: ConfigService, provider: JsonRpcProvider): Wallet => {
    const privateKey = configService.get<string>("PRIVATE_KEY", "0x");
    return new Wallet(privateKey, provider);
  },
};
