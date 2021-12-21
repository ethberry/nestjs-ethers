import { EMPTY, Observable } from "rxjs";
import { Injectable, Logger } from "@nestjs/common";
import { CustomTransportStrategy, Server } from "@nestjs/microservices";
import { ethers } from "ethers";

import { IContractServerOptions } from "./interfaces";

@Injectable()
export class EthersContractServer extends Server implements CustomTransportStrategy {
  protected readonly logger = new Logger(EthersContractServer.name);

  private provider: ethers.providers.WebSocketProvider;

  constructor(protected readonly options: IContractServerOptions["options"]) {
    super();
  }

  public createClient(): void {
    const url = this.getOptionsProp(this.options, "url");
    const options = this.getOptionsProp(this.options, "providerOptions");

    // https://github.com/ethers-io/ethers.js/issues/1053
    this.provider = new ethers.providers.WebSocketProvider(url, options);

    this.provider._websocket.on("error", (e: Error) => {
      this.logger.error(e.message, e.stack, EthersContractServer.name);
    });
  }

  public listen(callback: (e?: Error) => void): void {
    this.createClient();

    const contractOptions = this.getOptionsProp(this.options, "contractOptions");

    contractOptions.forEach(contractOption => {
      const { contractAddress, contractInterface, contractName, eventNames = [], filters = {} } = contractOption;

      const contract = new ethers.Contract(contractAddress, contractInterface, this.provider);

      // https://docs.ethers.io/v5/api/contract/contract/#Contract--events
      eventNames.forEach(eventName => {
        contract.on(eventName, (...data: Array<any>) => {
          void this.call({ contractName, eventName }, data[data.length - 1]);
        });
      });

      // https://docs.ethers.io/v5/concepts/events/
      Object.keys(filters).forEach(filterName => {
        contract.on(filters[filterName], (...data: Array<any>) => {
          void this.call({ contractName, filterName }, data[data.length - 1]);
        });
      });
    });

    callback();
  }

  private call(
    pattern: { contractName: string; eventName?: string; filterName?: string },
    data: any,
  ): Promise<Observable<any>> {
    const includeChainId = this.getOptionsProp(this.options, "includeChainId", false);
    const handler = this.getHandlerByPattern(
      this.normalizePattern(
        includeChainId ? Object.assign(pattern, { chainId: this.provider.network.chainId }) : pattern,
      ),
    );

    if (!handler) {
      return Promise.resolve(EMPTY);
    }

    return handler(data);
  }

  public close(): void {
    void this.provider.destroy();
  }
}
