import { Interface } from "ethers";

import erc721ABI from "../contracts/ERC721Ownable.json";
import exchangeABI from "../contracts/Exchange.json";
import { recursivelyDecodeResult } from "./decode-result";

describe("Ethers", function () {
  it("parseLog 1", function () {
    const iface = new Interface(erc721ABI.abi);
    const logDescription = iface.parseLog({
      data: "0x",
      topics: [
        "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
        "0x000000000000000000000000fe3b557e8fb62b89f4916b721be55ceb828dbd73",
        "0x000000000000000000000000d6a7c915066e17ba18024c799258c8a286ffbc00",
        "0x0000000000000000000000000000000000000000000000000000000000000004",
      ],
    });

    const actual = recursivelyDecodeResult(logDescription!.args);

    const expected = {
      tokenId: 4n,
      approved: "0xd6A7c915066E17ba18024c799258C8A286fFBc00",
      owner: "0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73",
    };

    expect(actual).toEqual(expected);
  });

  it("parseLog 2", function () {
    const iface = new Interface(exchangeABI.abi);
    const logDescription = iface.parseLog({
      data: "0x000000000000000000000000fe3b557e8fb62b89f4916b721be55ceb828dbd73000000000000000000000000e03ef2490316bff9808d936eee70f23896f075480000000000000000000000000000000000000000000000000000000000000001000000000000000000000000fe3b557e8fb62b89f4916b721be55ceb828dbd730000000000000000000000002114de86c8ea1fd8144c2f1e1e94c74e498afb1b0000000000000000000000000000000000000000000000000000000000989680",
      topics: ["0xf3b9076b481e6f90328250079267bf3928dcec4938f909ef39f283615432c0f1"],
    });

    const actual = recursivelyDecodeResult(logDescription!.args);

    const expected = {
      item: {
        account: "0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73",
        token: "0xE03Ef2490316bfF9808d936eEe70f23896F07548",
        tokenId: 1n,
      },
      price: {
        account: "0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73",
        token: "0x2114De86c8Ea1FD8144C2f1e1e94C74E498afB1b",
        amount: 10000000n,
      },
    };

    expect(actual).toEqual(expected);
  });
});
