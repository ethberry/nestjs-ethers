import { Logger, LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";

import { ETHERS_WS } from "../ethers.constants";

export const ethersWsProvider = {
  provide: ETHERS_WS,
  inject: [ConfigService, Logger],
  useFactory: (configService: ConfigService, loggerService: LoggerService): ethers.providers.WebSocketProvider => {
    const wsUrl = configService.get<string>("WEBSOCKET_ADDR", "ws://127.0.0.1:8546/");

    const provider = new ethers.providers.WebSocketProvider(wsUrl);

    provider._websocket.on("error", (e: Error) => {
      loggerService.error(e.message, e.stack, "EthersWsProvider");
    });

    return provider;
  },
};
