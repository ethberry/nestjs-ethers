import { Injectable } from "@nestjs/common";
import { ethers } from "ethers";
import { Interface } from "@ethersproject/abi";

import { IContractOptions } from "./interfaces";
import { EthersAbstractService } from "./ethers.abstract.service";
import { getPastEvents, parseLog } from "./utils/utils";

@Injectable()
export class EthersContractService extends EthersAbstractService {
  public async listen(contractOptions: Array<IContractOptions>): Promise<void> {
    await this.init(contractOptions);

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

  public async init(contractOptions: Array<IContractOptions>): Promise<void> {
    await Promise.all(
      contractOptions.map(async contractOption => {
        const { contractAddress, contractInterface, contractName, eventNames = [] } = contractOption;

        const events = await getPastEvents(
          this.provider,
          contractAddress,
          contractInterface,
          0,
          await this.provider.getBlockNumber(),
          1000,
        );

        const iface = contractInterface instanceof Interface ? contractInterface : new Interface(contractInterface);

        for (const log of events) {
          const description = parseLog(iface, log);
          if (!description || !eventNames.includes(description.name)) {
            return;
          }
          void this.call({ contractName, eventName: description.name }, description, log);
        }
      }),
    );
  }
}
