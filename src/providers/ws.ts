import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WebSocketProvider } from "ethers";

import { ETHERS_WS } from "../ethers.constants";

export const ethersWsProvider = {
  provide: ETHERS_WS,
  inject: [ConfigService, Logger],
  useFactory: (configService: ConfigService): WebSocketProvider => {
    const wsUrl = configService.get<string>("WEBSOCKET_ADDR", "ws://127.0.0.1:8546/");
    return new WebSocketProvider(wsUrl);
  },
};
