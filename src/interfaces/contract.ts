import { Type } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Networkish } from "@ethersproject/networks";

export interface IContractOptions {
  name: string;
  address: string;
  abi: any;
  eventNames: Array<string>;
}

export interface IContractServerOptions {
  customClass: Type<ClientProxy>;
  options: {
    url: string;
    providerOptions?: Networkish;
    contractOptions: Array<IContractOptions>;
  };
}
