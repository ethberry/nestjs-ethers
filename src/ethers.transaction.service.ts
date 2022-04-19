import { Injectable } from "@nestjs/common";
import { Block, TransactionResponse } from "@ethersproject/abstract-provider";

import { EventTypes } from "./interfaces";
import { EthersAbstractService } from "./ethers.abstract.service";

@Injectable()
export class EthersTransactionService extends EthersAbstractService {
  public async listen(eventNames: Array<EventTypes>): Promise<void> {
    await Promise.resolve();

    this.provider.on("block", (blockNumber: number) => {
      void this.processBlock(blockNumber, eventNames);
    });
  }

  private processBlock(blockNumber: number, eventNames: Array<EventTypes>): Promise<void> {
    return this.provider
      .getBlock(blockNumber)
      .then((block: Block) => {
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
        this.loggerService.error(e.message, e.stack, EthersTransactionService.name);
      });
  }

  private processTransaction(txHash: string): Promise<void> {
    return this.provider
      .getTransaction(txHash)
      .then((transaction: TransactionResponse) => {
        void this.call({ eventName: EventTypes.TRANSACTION }, transaction);
      })
      .catch(e => {
        this.loggerService.error(e.message, e.stack, EthersTransactionService.name);
      });
  }
}
