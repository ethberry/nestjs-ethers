import { transform } from "./ethers.utils";
import { Interface, Result } from "@ethersproject/abi";
import { abi } from "./interfaces/ABI.json";
import { Log } from "@ethersproject/abstract-provider";

describe("Utils", () => {
  it("transform", () => {
    const iface = new Interface(abi);
    const { args, ...rest } = iface.parseLog({
      logIndex: 1,
      removed: false,
      blockNumber: 1,
      blockHash: "0x558d18cab2cb064cd8e951f5e714ccb816447f7cb9019bf8381521c956037a29",
      transactionHash: "0xde3a4a6225489881229c330019dad534b843b863e5a1c5bc262e5c06a36ebaa2",
      transactionIndex: 1,
      address: "0xbf921f94fd9ef1738be25d8cecfdfe2c822c81b0",
      data: "0x",
      topics: [
        "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
        "0x000000000000000000000000fe3b557e8fb62b89f4916b721be55ceb828dbd73",
        "0x000000000000000000000000d6a7c915066e17ba18024c799258c8a286ffbc00",
        "0x0000000000000000000000000000000000000000000000000000000000000004",
      ],
    } as Log);

    const result = {
      ...rest,
      args: transform(args) as Result,
    };

    const expected = {
      tokenId: "4",
      approved: "0xd6A7c915066E17ba18024c799258C8A286fFBc00",
      owner: "0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73",
    };

    expect(result.args).toEqual(expected);
  });
});
