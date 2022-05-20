pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    constructor(
        string memory _name,
        string memory _id,
        uint256 _amount
    ) ERC20(_name, _id) {
        _mint(msg.sender, _amount);
    }
}
