import type { Interface } from "ethers";

export interface IContractOptions {
  contractType: string;
  contractAddress: Array<string>;
  // structural on purpose: CommonJS consumers resolve ethers/lib.commonjs types, this package resolves
  // ethers/lib.esm; the two Interface classes are nominally different (private members) although identical.
  // The service only calls parseLog().
  contractInterface: Pick<Interface, "parseLog">;
  eventSignatures: Array<string>;
}
