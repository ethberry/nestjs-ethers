import { EventFragment, LogDescription } from "ethers";
import { ILogWithIndex } from "./log";

export interface IJobObj {
  route: string;
  decoded: { fragment: EventFragment; name: string; signature: string; topic: string; args: Record<string, any> };
  log: ILogWithIndex;
}

export interface IEventObj {
  pattern: Record<string, string>;
  description: LogDescription;
  log: ILogWithIndex;
}

export const jobSorter = () => (a: IEventObj, b: IEventObj) =>
  parseInt(a.log.blockNumber.toString(), 16) - parseInt(b.log.blockNumber.toString(), 16) !== 0
    ? parseInt(a.log.blockNumber.toString(), 16) - parseInt(b.log.blockNumber.toString(), 16)
    : parseInt(a.log.transactionIndex.toString(), 16) - parseInt(b.log.transactionIndex.toString(), 16) !== 0
    ? parseInt(a.log.transactionIndex.toString(), 16) - parseInt(b.log.transactionIndex.toString(), 16)
    : parseInt(a.log.logIndex.toString(), 16) - parseInt(b.log.logIndex.toString(), 16);
