pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "../exchange/exchange.sol";

contract Factory {
    mapping(address => address) public tokenToExchange;

    function createExchange(address _token) public returns (Exchange) {
        require(_token != address(0), "Factory: invalid token address");
        require(
            tokenToExchange[_token] == address(0),
            "Factory: exchange already exists!"
        );

        Exchange exchange = new Exchange(_token, payable(address(this)));
        tokenToExchange[_token] = address(exchange);

        return exchange;
    }

    function getExchange(address _token) public view returns (address) {
        return tokenToExchange[_token];
    }
}
