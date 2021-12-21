import { EMPTY, Observable } from "rxjs";
import { Injectable, Logger } from "@nestjs/common";
import { CustomTransportStrategy, Server } from "@nestjs/microservices";
import { ethers } from "ethers";
import { Block, TransactionResponse } from "@ethersproject/abstract-provider";

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
    const providerOptions = this.getOptionsProp(this.options, "providerOptions");

    // https://github.com/ethers-io/ethers.js/issues/1053
    this.provider = new ethers.providers.WebSocketProvider(url, providerOptions);

    this.provider._websocket.on("error", (e: Error) => {
      this.logger.error(e.message, e.stack, EthersTransactionServer.name);
    });
  }

  public listen(callback: (e?: Error) => void): void {
    this.createClient();
    this.provider.on("block", (blockNumber: number) => {
      void this.processBlock(blockNumber);
    });
    callback();
  }

  private processBlock(blockNumber: number): Promise<void> {
    return this.provider
      .getBlock(blockNumber)
      .then((block: Block) => {
        const eventNames = this.getOptionsProp(this.options, "eventNames");
        if (eventNames.includes(EventTypes.BLOCK)) {
          void this.call({ eventName: EventTypes.BLOCK }, block);
        }
        if (eventNames.includes(EventTypes.TRANSACTION)) {
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
      .then((transaction: TransactionResponse) => {
        void this.call({ eventName: EventTypes.TRANSACTION }, transaction);
      })
      .catch(e => {
        this.logger.error(e.message, e.stack, EthersTransactionServer.name);
      });
  }

  private call(pattern: { eventName: EventTypes }, data: any): Promise<Observable<any>> {
    const handler = this.getHandlerByPattern(this.normalizePattern(pattern));

    if (!handler) {
      return Promise.resolve(EMPTY);
    }

    return handler(data, this.provider.network);
  }

  public close(): void {
    void this.provider.destroy();
  }
}
