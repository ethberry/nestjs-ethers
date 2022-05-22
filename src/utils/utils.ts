import { Log, Provider } from "@ethersproject/abstract-provider";
import { Interface, LogDescription } from "@ethersproject/abi";

export const getPastEvents = async (
  provider: Provider,
  address: string,
  fromBlockNumber: number,
  toBlockNumber: number,
  chunkLimit = 0,
) => {
  const totalBlocks = toBlockNumber - fromBlockNumber;
  const chunks = [];

  if (chunkLimit > 0 && totalBlocks > chunkLimit) {
    const count = Math.ceil(totalBlocks / chunkLimit);
    let startingBlock = fromBlockNumber;

    for (let index = 0; index < count; index++) {
      const fromRangeBlock = startingBlock;
      const toRangeBlock = index === count - 1 ? toBlockNumber : startingBlock + chunkLimit;
      startingBlock = toRangeBlock + 1;

      chunks.push({ fromBlock: fromRangeBlock, toBlock: toRangeBlock });
    }
  } else {
    chunks.push({ fromBlock: fromBlockNumber, toBlock: toBlockNumber });
  }

  const events: Array<Log> = [];
  for (const chunk of chunks) {
    const logs = await provider.getLogs({
      fromBlock: chunk.fromBlock,
      toBlock: chunk.toBlock,
      address,
    });

    events.push(...logs);
  }

  return events;
};

export const parseLog = (iface: Interface, log: Log): LogDescription | null => {
  try {
    const { args, ...rest } = iface.parseLog(log);
    return {
      ...rest,
      args: JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(args).splice(args.length)))),
    };
  } catch (e) {
    return null;
  }
};
