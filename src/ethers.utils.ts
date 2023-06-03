import { JsonRpcProvider, Log } from "ethers";

export const getPastEvents = async (
  provider: JsonRpcProvider,
  address: Array<string>,
  topics: Array<string | Array<string> | null>,
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
    const logs: Log[] = await provider.send("eth_getLogs", [
      {
        address,
        fromBlock: `0x${chunk.fromBlock.toString(16)}`,
        toBlock: `0x${chunk.toBlock.toString(16)}`,
        topics,
      },
    ]);

    if (logs) {
      events.push(...logs);
    }
  }

  return events;
};
