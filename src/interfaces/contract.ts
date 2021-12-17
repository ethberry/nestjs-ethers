import { Type } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Networkish } from "@ethersproject/networks";
import { ContractInterface } from "@ethersproject/contracts";
import { EventFilter } from "ethers";

export interface IContractOptions {
  contractName: string;
  contractAddress: string;
  contractInterface: ContractInterface;
  eventNames?: Array<string>;
  filters?: { [filterName: string]: EventFilter };
}

export interface IContractServerOptions {
  customClass: Type<ClientProxy>;
  options: {
    url: string;
    includeChainId?: boolean;
    providerOptions?: Networkish;
    contractOptions: Array<IContractOptions>;
  };
}
