import { Interface } from "ethers";

import { abi } from "./interfaces/abi/ABI.json";

describe("Utils", () => {
  it("transform", () => {
    const iface = new Interface(abi);
    const logDescription = iface.parseLog({
      data: "0x",
      topics: [
        "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
        "0x000000000000000000000000fe3b557e8fb62b89f4916b721be55ceb828dbd73",
        "0x000000000000000000000000d6a7c915066e17ba18024c799258c8a286ffbc00",
        "0x0000000000000000000000000000000000000000000000000000000000000004",
      ],
    });

    const expected = {
      tokenId: 4n,
      approved: "0xd6A7c915066E17ba18024c799258C8A286fFBc00",
      owner: "0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73",
    };

    expect(logDescription?.args.toObject()).toEqual(expected);
  });
});
