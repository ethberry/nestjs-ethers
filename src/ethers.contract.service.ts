import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Interface } from "@ethersproject/abi";

import { EthersAbstractService } from "./ethers.abstract.service";
import { getPastEvents, parseLog } from "./ethers.utils";

@Injectable()
export class EthersContractService extends EthersAbstractService {
  private latency: number;
  private fromBlock: number;
  private toBlock: number;

  public async init(): Promise<void> {
    this.latency = ~~this.configService.get<string>("LATENCY", "32");
    this.fromBlock = this.options.block.fromBlock || ~~this.configService.get<string>("STARTING_BLOCK", "0");
    this.toBlock = await this.provider.getBlockNumber();
    return this.getPastEvents(this.fromBlock, this.toBlock - this.latency);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  public async listen(): Promise<void> {
    this.fromBlock = this.toBlock - this.latency + 1;
    this.toBlock = await this.provider.getBlockNumber();
    return this.getPastEvents(this.fromBlock, this.toBlock - this.latency);
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
        continue;
      }
      void this.call({ contractType, eventName: description.name }, description, log);
    }
  }

  public updateListener(address: Array<string>, fromBlock?: number): void {
    if (address.length > 0) {
      this.options.contract.contractAddress.push(...address);
    }

    if (fromBlock) {
      this.options.block.fromBlock = fromBlock;
    }
  }

  public getLastBlock(): number {
    return this.toBlock - this.latency;
  }
}
