import { ContractInterface } from "@ethersproject/contracts";

export interface IContractOptions {
  contractType: string;
  contractAddress: Array<string>;
  contractInterface: ContractInterface;
  eventNames?: Array<string>;
  topics?: Array<string | Array<string> | null>;
}
