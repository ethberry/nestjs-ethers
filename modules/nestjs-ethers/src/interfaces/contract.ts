import { Interface } from "ethers";

export interface IContractOptions {
  contractType: string;
  contractAddress: Array<string>;
  contractInterface: Interface;
  eventNames?: Array<string>;
  topics?: Array<string | Array<string> | null>;
}
