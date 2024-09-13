import { ILogWithIndex } from "./log";

export const logComparator = (a: ILogWithIndex, b: ILogWithIndex) =>
  parseInt(a.blockNumber.toString(), 16) - parseInt(b.blockNumber.toString(), 16) !== 0
    ? parseInt(a.blockNumber.toString(), 16) - parseInt(b.blockNumber.toString(), 16)
    : parseInt(a.transactionIndex.toString(), 16) - parseInt(b.transactionIndex.toString(), 16) !== 0
      ? parseInt(a.transactionIndex.toString(), 16) - parseInt(b.transactionIndex.toString(), 16)
      : parseInt(a.logIndex.toString(), 16) - parseInt(b.logIndex.toString(), 16);
