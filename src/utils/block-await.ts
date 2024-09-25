import { JsonRpcProvider } from "ethers";

const errorMessage = "Unable to retrieve the block number";

export function delay(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const waitForConfirmation = async function (
  provider: JsonRpcProvider,
  blockDelay = 1,
  millisecondsDelay = 1000,
): Promise<void> {
  const initialBlockNumber = await provider.getBlockNumber();
  if (!initialBlockNumber) {
    throw Error(errorMessage);
  }

  while (true) {
    await delay(millisecondsDelay);
    const currentBlockNumber = await provider.getBlockNumber();
    if (!currentBlockNumber) {
      throw new Error(errorMessage);
    }

    if (currentBlockNumber - initialBlockNumber >= blockDelay) {
      break;
    }
  }
};
