import { Injectable, Inject } from "@nestjs/common";
import { HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import { WebSocketProvider } from "ethers";
import ws from "ws";

import { ETHERS_WS } from "./ethers.constants";

@Injectable()
export class EthersHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(ETHERS_WS)
    protected readonly provider: WebSocketProvider,
  ) {
    super();
  }

  public async isHealthy(key: string): Promise<HealthIndicatorResult> {
    await Promise.resolve();
    const isHealthy = this.provider.websocket.readyState === ws.OPEN;
    return super.getStatus(key, isHealthy);
  }
}
