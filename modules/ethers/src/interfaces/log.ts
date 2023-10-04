import { EventFragment, Log } from "ethers";

export interface ILogEvent<T = any> {
  fragment: EventFragment;
  name: string;
  signature: string;
  topic: string;
  args: T;
}

export interface ILogWithIndex extends Log {
  logIndex: string;
}
