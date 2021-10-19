export interface IEvent<T = any> {
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;
  removed: boolean;
  address: string;
  data: string;
  topics: Array<string>;
  transactionHash: string;
  logIndex: number;
  event: string;
  eventSignature: string;
  args: T;
}
