import { EventFragment } from "ethers";

export interface ILogEvent<T = any> {
  fragment: EventFragment;
  name: string;
  signature: string;
  topic: string;
  args: T;
}
