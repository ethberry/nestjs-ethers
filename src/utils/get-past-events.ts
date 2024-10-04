import { JsonRpcProvider, keccak256, Log, toUtf8Bytes } from "ethers";

export const getPastEvents = async (
  provider: JsonRpcProvider,
  address: Array<string>,
  allSignatures: Array<string>,
  fromBlockNumber: number,
  toBlockNumber: number,
  chunkSize = 0,
) => {
  const totalBlocks = toBlockNumber - fromBlockNumber;
  const chunks = [];

  if (chunkSize > 0 && totalBlocks > chunkSize) {
    const count = Math.ceil(totalBlocks / chunkSize);
    let startingBlock = fromBlockNumber;

    for (let index = 0; index < count; index++) {
      const fromRangeBlock = startingBlock;
      const toRangeBlock = index === count - 1 ? toBlockNumber : startingBlock + chunkSize;
      startingBlock = toRangeBlock;

      chunks.push({ fromBlock: fromRangeBlock, toBlock: toRangeBlock });
    }
  } else {
    chunks.push({ fromBlock: fromBlockNumber, toBlock: toBlockNumber });
  }

  const topics = [allSignatures.map(signature => keccak256(toUtf8Bytes(signature)))];

  const events: Array<Log> = [];
  for (const chunk of chunks) {
    const logs: Log[] = await provider.send("eth_getLogs", [
      {
        address,
        topics,
        fromBlock: `0x${chunk.fromBlock.toString(16)}`,
        toBlock: `0x${chunk.toBlock.toString(16)}`,
      },
    ]);

    if (logs?.length) {
      events.push(...logs);
    }
  }

  return events;
};
