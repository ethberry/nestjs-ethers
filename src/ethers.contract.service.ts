import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Interface } from "@ethersproject/abi";

import { EthersAbstractService } from "./ethers.abstract.service";
import { getPastEvents, parseLog } from "./utils/utils";

@Injectable()
export class EthersContractService extends EthersAbstractService {
  private latency: number;
  private fromBlockNumber: number;
  private toBlockNumber: number;

  public async init(): Promise<void> {
    this.latency = ~~this.configService.get<string>("LATENCY", "32");
    this.fromBlockNumber = this.options.block.startBlock || ~~this.configService.get<string>("STARTING_BLOCK", "0");
    this.toBlockNumber = await this.provider.getBlockNumber();
    return this.getPastEvents(this.fromBlockNumber, this.toBlockNumber - this.latency);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  public async listen(): Promise<void> {
    this.fromBlockNumber = this.toBlockNumber - this.latency;
    this.toBlockNumber = await this.provider.getBlockNumber();
    return this.getPastEvents(this.fromBlockNumber, this.toBlockNumber - this.latency);
  }

  public async getPastEvents(fromBlockNumber: number, toBlockNumber: number): Promise<void> {
    const { contractAddress, contractInterface, contractType, eventNames = [] } = this.options.contract;

    // don't listen void
    if (!contractAddress.length) return;

    const events = await getPastEvents(this.provider, contractAddress, fromBlockNumber, toBlockNumber, 1000);

    const iface = contractInterface instanceof Interface ? contractInterface : new Interface(contractInterface);

    for (const log of events) {
      const description = parseLog(iface, log);
      if (!description || !eventNames.includes(description.name)) {
        return;
      }
      void this.call({ contractType, eventName: description.name }, description, log);
    }
  }

  public updateListener(address: Array<string>, fromBlock?: number): void {
    if (address.length > 0) {
      this.options.contract.contractAddress.concat(address);
    }

    if (fromBlock) {
      this.options.block.startBlock = fromBlock;
    }
  }
}
