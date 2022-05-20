pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract Exchange is ERC20 {
    address public tokenAddress;

    constructor(address _token) ERC20("UNI LP", "UNILP") {
        require(_token != address(0), "invalid token address");
        tokenAddress = _token;
    }

    function addLiquidity(uint256 _tokenAmount)
        public
        payable
        returns (uint256)
    {
        IERC20 token = IERC20(tokenAddress);
        if (getReserves() == 0) {
            token.transferFrom(msg.sender, address(this), _tokenAmount);
            _mint(msg.sender, msg.value);
            return msg.value;
        } else {
            uint256 currentRatio = ((address(this).balance - msg.value) *
                1000) / getReserves();
            uint256 userRatio = (msg.value * 1000) / _tokenAmount;

            require(
                currentRatio == userRatio,
                "Liquidity ratio is not equal to current exchange ratio"
            );

            token.transferFrom(msg.sender, address(this), _tokenAmount);
            uint256 _lpMint = (totalSupply() * msg.value) /
                (address(this).balance);
            _mint(msg.sender, _lpMint);
            return _lpMint;
        }
    }

    function removeLiquidity(uint256 _amount)
        public
        returns (uint256, uint256)
    {
        require(_amount > 0, "Amount must be > 0!");
        require(
            balanceOf(msg.sender) >= _amount,
            "you don't have enough lp tokens!"
        );

        (uint256 removedEth, uint256 removedToken) = getLPOutput(_amount);
        _burn(msg.sender, _amount);
        payable(msg.sender).transfer(removedEth);
        IERC20(tokenAddress).transfer(msg.sender, removedToken);

        return (removedEth, removedToken);
    }

    function getReserves() public view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }

    function getTokenAmount(uint256 ethAmount, bool ethSent)
        public
        view
        returns (uint256)
    {
        require(ethAmount > 0, "you gotta sell something dawg");

        uint256 ethReserves;
        if (ethSent) {
            ethReserves = address(this).balance - ethAmount;
        } else ethReserves = address(this).balance;
        return _getAmount(ethAmount, ethReserves, getReserves());
    }

    function getEthAmount(uint256 tokenAmount) public view returns (uint256) {
        require(tokenAmount > 0, "gotta input more than zero bruv");
        return _getAmount(tokenAmount, getReserves(), address(this).balance);
    }

    function ethToTokenSwap(uint256 _minTokens) public payable {
        uint256 tokensBought = getTokenAmount(msg.value, true);
        require(tokensBought >= _minTokens, "Too Much Slippage!");
        IERC20(tokenAddress).transfer(msg.sender, tokensBought);
    }

    function tokenToEthSwap(uint256 _tokensTraded, uint256 _minTokens) public {
        uint256 ethBought = getEthAmount(_tokensTraded);
        require(ethBought >= _minTokens, "Too Much Slippage!");
        IERC20(tokenAddress).transferFrom(
            msg.sender,
            address(this),
            _tokensTraded
        );
        payable(msg.sender).transfer(ethBought);
    }

    function _getAmount(
        uint256 inputAmount,
        uint256 inputReserve,
        uint256 outputReserve
    ) private pure returns (uint256) {
        require(inputReserve > 0 && outputReserve > 0, "no liquidity");
        uint256 inputAmountWithFee = inputAmount * 99;
        uint256 numerator = outputReserve * inputAmountWithFee;
        uint256 denominator = inputReserve * 100 + inputAmountWithFee;
        return numerator / denominator;
    }

    function getLPOutput(uint256 _amount)
        public
        view
        returns (uint256, uint256)
    {
        uint256 removedEth = (address(this).balance * _amount) / totalSupply();
        uint256 removedToken = (getReserves() * _amount) / totalSupply();

        return (removedEth, removedToken);
    }
}
