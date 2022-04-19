import { Injectable } from "@nestjs/common";
import { ethers } from "ethers";

import { IContractOptions } from "./interfaces";
import { EthersAbstractService } from "./ethers.abstract.service";

@Injectable()
export class EthersContractService extends EthersAbstractService {
  public async listen(contractOptions: Array<IContractOptions>): Promise<void> {
    await Promise.resolve();

    contractOptions.forEach(contractOption => {
      const { contractAddress, contractInterface, contractName, eventNames = [], filters = {} } = contractOption;

      const contract = new ethers.Contract(contractAddress, contractInterface, this.provider);

      // https://docs.ethers.io/v5/api/contract/contract/#Contract--events
      eventNames.forEach(eventName => {
        contract.on(eventName, (...data: Array<any>) => {
          void this.call({ contractName, eventName }, data[data.length - 1]);
        });
      });

      // https://docs.ethers.io/v5/concepts/events/
      Object.keys(filters).forEach(filterName => {
        contract.on(filters[filterName], (...data: Array<any>) => {
          void this.call({ contractName, filterName }, data[data.length - 1]);
        });
      });
    });
  }
}
