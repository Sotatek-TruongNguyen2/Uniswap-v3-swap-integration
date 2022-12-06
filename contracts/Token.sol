// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20, Ownable {
    
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        mint(msg.sender, 10000000000000000000000);
    }

    function mint(address _address, uint256 _amount) public {
        _mint(_address, _amount);
    }
}
