import { Interface } from "ethers";

export interface IContractOptions {
  contractType: string;
  contractAddress: Array<string>;
  contractInterface: Interface;
  eventSignatures: Array<string>;
}
