import { EventFragment } from "@ethersproject/abi";

export interface ILogEvent<T = any> {
  eventFragment: EventFragment;
  name: string;
  signature: string;
  topic: string;
  args: T;
}
