// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://webberry.io/

pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

struct Item {
  address account;
  address token;
  uint256 tokenId;
}

struct Price {
  address account;
  address token;
  uint256 amount;
}

contract Exchange is Ownable {
  event Swap(Item item, Price price);

  constructor() Ownable(_msgSender()) {

  }

  function swap(Item calldata item, Price calldata price) public virtual onlyOwner {
    IERC20(price.token).transferFrom(price.account, item.account, price.amount);
    IERC721(item.token).transferFrom(item.account, price.account, item.tokenId);
    emit Swap(item, price);
  }
}
