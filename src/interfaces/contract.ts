import { Interface, InterfaceAbi } from "ethers";

export interface IContractOptions {
  contractType: string;
  contractAddress: Array<string>;
  contractInterface: Interface | InterfaceAbi;
  eventNames?: Array<string>;
  topics?: Array<string | Array<string> | null>;
}
