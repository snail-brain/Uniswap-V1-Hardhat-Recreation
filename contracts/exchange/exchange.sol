pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../factory/factory.sol";

contract Exchange is ERC20 {
    address public tokenAddress;
    Factory public factory;

    constructor(address _token, address payable _factoryAddress)
        ERC20("UNI LP", "UNILP")
    {
        require(_token != address(0), "Exchange: invalid token address");
        tokenAddress = _token;
        factory = Factory(_factoryAddress);
    }

    /*//////////////////////////////////////////////////////////////
                            USER ACTIONS
    //////////////////////////////////////////////////////////////*/

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
                "Exchange: Liquidity ratio is not equal to current exchange ratio"
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
        require(_amount > 0, "Exchange: Amount must be > 0!");
        require(
            balanceOf(msg.sender) >= _amount,
            "Exchange: you don't have enough lp tokens!"
        );

        uint256 removedEth = (address(this).balance * _amount) / totalSupply();
        uint256 removedToken = (getReserves() * _amount) / totalSupply();

        _burn(msg.sender, _amount);
        payable(msg.sender).transfer(removedEth);
        IERC20(tokenAddress).transfer(msg.sender, removedToken);

        return (removedEth, removedToken);
    }

    function ethToTokenSwap(uint256 _minTokens)
        public
        payable
        returns (uint256)
    {
        uint256 tokensBought = _getAmount(
            msg.value,
            address(this).balance - msg.value,
            getReserves()
        );
        require(tokensBought >= _minTokens, "Exchange: Too Much Slippage!");
        IERC20(tokenAddress).transfer(msg.sender, tokensBought);

        return tokensBought;
    }

    function tokenToEthSwap(uint256 _tokensTraded, uint256 _minTokens)
        public
        returns (uint256)
    {
        uint256 ethBought = _getAmount(
            _tokensTraded,
            getReserves(),
            address(this).balance
        );
        require(ethBought >= _minTokens, "Exchange: Too Much Slippage");
        IERC20(tokenAddress).transferFrom(
            msg.sender,
            address(this),
            _tokensTraded
        );
        payable(msg.sender).transfer(ethBought);

        return ethBought;
    }

    function tokenToTokenSwap(
        address _token,
        uint256 _tokensTraded,
        uint256 _minTokens
    ) public returns (uint256) {
        Exchange _exchange = Exchange(factory.getExchange(_token));
        require(address(_exchange) != address(0), "Exchange: Invalid Exchange");
        uint256 ethAmount = _getAmount(
            _tokensTraded,
            getReserves(),
            address(this).balance
        );

        // transfer tokens from user to this contract
        IERC20(tokenAddress).transferFrom(
            msg.sender,
            address(this),
            _tokensTraded
        );

        // Send eth to 2nd exchange in return for token
        uint256 tokensBought = _exchange.ethToTokenSwap{value: ethAmount}(
            _minTokens
        );

        // transfer new tokens to user
        IERC20(_token).transfer(msg.sender, tokensBought);

        return tokensBought;
    }

    /*//////////////////////////////////////////////////////////////
                        HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getReserves() public view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }

    function getTokenAmount(uint256 ethAmount, bool ethSent)
        public
        view
        returns (uint256)
    {
        require(ethAmount > 0, "Exchange: you gotta sell something dawg");

        uint256 ethReserves;
        if (ethSent) {
            ethReserves = address(this).balance - ethAmount;
        } else ethReserves = address(this).balance;
        return _getAmount(ethAmount, ethReserves, getReserves());
    }

    function getEthAmount(uint256 tokenAmount) public view returns (uint256) {
        require(tokenAmount > 0, "Exchange: gotta input more than zero bruv");
        return _getAmount(tokenAmount, getReserves(), address(this).balance);
    }

    function getFactory() public view returns (address) {
        return address(factory);
    }

    function _getAmount(
        uint256 inputAmount,
        uint256 inputReserve,
        uint256 outputReserve
    ) private pure returns (uint256) {
        require(
            inputReserve > 0 && outputReserve > 0,
            "Exchange: no liquidity"
        );
        uint256 inputAmountWithFee = inputAmount * 99;
        uint256 numerator = outputReserve * inputAmountWithFee;
        uint256 denominator = inputReserve * 100 + inputAmountWithFee;
        return numerator / denominator;
    }
}
