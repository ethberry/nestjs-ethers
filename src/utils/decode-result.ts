import { Result } from "ethers";

export const recursivelyDecodeResult = (result: Result): Record<string, any> => {
  if (typeof result !== "object") {
    // Raw primitive
    return result;
  }

  const obj = result.toObject();
  if (obj._) {
    // Array
    return result.toArray().map(item => recursivelyDecodeResult(item));
  }

  Object.keys(obj).forEach(key => {
    // Object
    obj[key] = recursivelyDecodeResult(obj[key]);
  });

  return obj;
};
