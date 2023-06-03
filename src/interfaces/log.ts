import { EventFragment } from "ethers";

export interface ILogEvent<T = any> {
  eventFragment: EventFragment;
  name: string;
  signature: string;
  topic: string;
  args: T;
}
