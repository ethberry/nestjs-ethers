import { ContractInterface } from "@ethersproject/contracts";
import { EventFilter } from "ethers";

export interface IContractOptions {
  contractType: string;
  contractAddress: Array<string>;
  contractInterface: ContractInterface;
  eventNames?: Array<string>;
  filters?: { [filterName: string]: EventFilter };
}
