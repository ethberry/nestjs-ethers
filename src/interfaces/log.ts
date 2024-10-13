import { EventFragment } from "ethers";

export interface ILogEvent<T = any> {
  fragment: EventFragment;
  signature: string;
  topic: string;
  name: string;
  args: T;
}
