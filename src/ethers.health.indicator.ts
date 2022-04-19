import { Injectable, Inject } from "@nestjs/common";
import { HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import { ethers } from "ethers";
import ws from "ws";

import { ETHERS_WS } from "./ethers.constants";

@Injectable()
export class EthersHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(ETHERS_WS)
    protected readonly provider: ethers.providers.WebSocketProvider,
  ) {
    super();
  }

  public async isHealthy(key: string): Promise<HealthIndicatorResult> {
    await Promise.resolve();
    const isHealthy = this.provider._websocket.readyState === ws.OPEN;
    return super.getStatus(key, isHealthy);
  }
}
