import { Type } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Networkish } from "@ethersproject/networks";

export enum EventTypes {
  BLOCK = "BLOCK",
  TRANSACTION = "TRANSACTION",
}

export interface ITransactionServerOptions {
  customClass: Type<ClientProxy>;
  options: {
    url: string;
    providerOptions?: Networkish;
    events: Array<EventTypes>;
  };
}
