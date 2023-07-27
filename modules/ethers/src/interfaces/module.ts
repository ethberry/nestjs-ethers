import { IContractOptions } from "./contract";
import { IBlockOptions } from "./blockchain";

export interface IModuleOptions {
  contract: IContractOptions;
  block: IBlockOptions;
}
