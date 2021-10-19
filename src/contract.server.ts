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
  }

  public listen(callback: (e?: Error) => void): void {
    this.createClient();

    const contractOptions = this.getOptionsProp(this.options, "contractOptions");

    contractOptions.forEach(contractOption => {
      const contract = new ethers.Contract(contractOption.address, contractOption.abi, this.provider);

      // https://ethereum.stackexchange.com/questions/87643/how-to-listen-to-contract-events-using-ethers-js
      // https://ethereum.stackexchange.com/questions/91966/get-number-of-all-the-past-events-using-ethers-v5
      contractOption.eventNames.forEach(eventName => {
        contract.on(eventName, (...data: Array<any>) => {
          void this.call({ contract: contractOption.name, event: eventName }, data[data.length - 1]);
        });
      });
    });

    callback();
  }

  private call(pattern: any, data: any): Promise<Observable<any>> {
    const handler = this.getHandlerByPattern(this.normalizePattern(pattern));

    if (!handler) {
      return Promise.resolve(EMPTY);
    }

    return handler(data);
  }

  public close(): void {
    void this.provider.destroy();
  }
}
