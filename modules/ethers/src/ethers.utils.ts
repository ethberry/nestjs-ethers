import { JsonRpcProvider, keccak256, Log, toUtf8Bytes } from "ethers";

import { patchBigInt } from "@gemunion/utils-eth";

patchBigInt();

export const keccak256It = function (value: string): string {
  return keccak256(toUtf8Bytes(value));
};

export const getPastEvents = async (
  provider: JsonRpcProvider,
  address: Array<string>,
  allSignatures: Array<string>,
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
      startingBlock = toRangeBlock;

      chunks.push({ fromBlock: fromRangeBlock, toBlock: toRangeBlock });
    }
  } else {
    chunks.push({ fromBlock: fromBlockNumber, toBlock: toBlockNumber });
  }
  const topics = [allSignatures.map(signature => keccak256It(signature))];

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
