import { ConfigService } from "@nestjs/config";
import { JsonRpcProvider, Wallet } from "ethers";

import { ETHERS_RPC, ETHERS_SIGNER } from "../ethers.constants";

// This is just an example for testing purposes.
// Do not store private keys in public configuration.
// Use a secure storage solution like
// AWS Secrets Manager or Google Cloud Secret Manager
// to store and retrieve sensitive information securely.
export const ethersSignerProvider = {
  provide: ETHERS_SIGNER,
  inject: [ConfigService, ETHERS_RPC],
  useFactory: (configService: ConfigService, provider: JsonRpcProvider): Wallet => {
    const privateKey = configService.get<string>("PRIVATE_KEY", "0x");
    return new Wallet(privateKey, provider);
  },
};
