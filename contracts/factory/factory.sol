pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "../exchange/exchange.sol";

contract Factory {
    mapping(address => address) public tokenToExchange;

    function createExchange(address _token) public returns (address) {
        require(_token != address(0), "invalid token address");
        require(
            tokenToExchange[_token] == address(0),
            "exchange already exists!"
        );

        Exchange exchange = new Exchange(_token);
        tokenToExchange[_token] = address(exchange);

        return address(exchange);
    }

    function getExchange(address _token) public view returns (address) {
        return tokenToExchange[_token];
    }
}
