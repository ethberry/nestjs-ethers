import { ConfigService } from "@nestjs/config";
import { JsonRpcProvider, Wallet } from "ethers";

import { ETHERS_RPC, ETHERS_SIGNER } from "@gemunion/nestjs-ethers";
import { SecretManagerService } from "@gemunion/nest-js-module-secret-manager-env";
import { privateKey } from "@gemunion/constants";

export const ethersSignerProvider = {
  provide: ETHERS_SIGNER,
  inject: [ConfigService, SecretManagerService, ETHERS_RPC],
  useFactory: async (
    configService: ConfigService,
    secretManagerService: SecretManagerService,
    provider: JsonRpcProvider,
  ): Promise<Wallet> => {
    const secretName = configService.get<string>("PRIVATE_KEY_SECRET_NAME", "PRIVATE_KEY");
    const secretValue = await secretManagerService.getSecret(secretName, privateKey);

    return new Wallet(secretValue, provider);
  },
};
