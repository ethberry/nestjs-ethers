import { EMPTY, Observable } from "rxjs";
import { Injectable, Logger } from "@nestjs/common";
import { CustomTransportStrategy, Server } from "@nestjs/microservices";
import { ethers, Transaction } from "ethers";
import { Block } from "@ethersproject/abstract-provider";

import { EventTypes, ITransactionServerOptions } from "./interfaces";

@Injectable()
export class EthersTransactionServer extends Server implements CustomTransportStrategy {
  protected readonly logger = new Logger(EthersTransactionServer.name);

  private provider: ethers.providers.WebSocketProvider;

  constructor(protected readonly options: ITransactionServerOptions["options"]) {
    super();
  }

  public createClient(): void {
    const url = this.getOptionsProp(this.options, "url");
    const options = this.getOptionsProp(this.options, "providerOptions");

    // https://github.com/ethers-io/ethers.js/issues/1053
    // https://ethereum.stackexchange.com/questions/87643/how-to-listen-to-contract-events-using-ethers-js
    this.provider = new ethers.providers.WebSocketProvider(url, options);

    this.provider._websocket.on("error", (e: Error) => {
      this.logger.error(e.message, e.stack, EthersTransactionServer.name);
    });
  }

  public listen(callback: (e?: Error) => void): void {
    this.createClient();
    this.provider.on("block", (blockNumber: any) => {
      void this.processBlock(blockNumber);
    });
    callback();
  }

  private processBlock(blockNumber: number): Promise<void> {
    return this.provider
      .getBlock(blockNumber)
      .then((block: Block) => {
        const events = this.getOptionsProp(this.options, "events");
        if (events.includes(EventTypes.BLOCK)) {
          void this.call(EventTypes.BLOCK, block);
        }
        if (events.includes(EventTypes.TRANSACTION)) {
          for (const txHash of block.transactions) {
            void this.processTransaction(txHash);
          }
        }
      })
      .catch(e => {
        this.logger.error(e.message, e.stack, EthersTransactionServer.name);
      });
  }

  private processTransaction(txHash: string): Promise<void> {
    return this.provider
      .getTransaction(txHash)
      .then((transaction: Transaction) => {
        void this.call(EventTypes.TRANSACTION, transaction);
      })
      .catch(e => {
        this.logger.error(e.message, e.stack, EthersTransactionServer.name);
      });
  }

  private call(pattern: string, data: any): Promise<Observable<any>> {
    const handler = this.getHandlerByPattern(pattern);

    if (!handler) {
      return Promise.resolve(EMPTY);
    }

    return handler(data);
  }

  public close(): void {
    void this.provider.destroy();
  }
}
