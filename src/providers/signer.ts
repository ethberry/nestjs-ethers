import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";

import { ETHERS_RPC, ETHERS_SIGNER } from "../ethers.constants";

export const ethersSignerProvider = {
  provide: ETHERS_SIGNER,
  inject: [ConfigService, ETHERS_RPC],
  useFactory: (configService: ConfigService, provider: ethers.providers.JsonRpcProvider): ethers.Wallet => {
    const privateKey = configService.get<string>(
      "PRIVATE_KEY",
      "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63",
    );

    const wallet = new ethers.Wallet(privateKey, provider);

    return wallet;
  },
};
