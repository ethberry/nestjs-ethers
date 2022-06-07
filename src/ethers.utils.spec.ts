import { BigNumber } from "ethers";
import { transform } from "./ethers.utils";

describe("Utils", () => {
  it("transform", () => {
    const data = [];
    data[0] = BigNumber.from(12345);
    // @ts-ignore
    data.test = BigNumber.from(12345);

    const actial = transform(data);
    const expected = { test: "12345" };

    expect(actial).toEqual(expected);
  });
});
