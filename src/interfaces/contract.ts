import { ContractInterface } from "@ethersproject/contracts";
import { EventFilter } from "ethers";

export interface IContractOptions {
  contractName: string;
  contractAddress: string;
  contractInterface: ContractInterface;
  eventNames?: Array<string>;
  filters?: { [filterName: string]: EventFilter };
}
