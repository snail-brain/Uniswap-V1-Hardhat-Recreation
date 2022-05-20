import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import "@nomiclabs/hardhat-waffle";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import * as helper from "../scripts/helpful_scripts";

const getBalance = ethers.provider.getBalance;
const toWei = (value: any) =>
    ethers.utils.parseEther(value.toString());
const fromWei = (value: any) =>
    ethers.utils.formatEther(BigNumber.from(value.toString()));


describe("Exchange", () => {
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let exchange: Contract;
    let token: Contract;
    let exchangeEthBalance: BigNumber;
    let exchangeTokenBalance: BigNumber;
    let ownerEthBalance: BigNumber;
    let ownerTokenBalance: BigNumber;
    let lpTokenBalance: BigNumber;
    const tokenAmount = toWei('10');
    const ethAmount = toWei('5');


    beforeEach(async () => {
        [owner, user] = await ethers.getSigners();
        token = await helper.deployContract("Token", "Snail", "SNL", toWei('10000'));
        exchange = await helper.deployContract("Exchange", token.address);

        await helper.waitForTx(await token.approve(exchange.address, tokenAmount));
        await helper.waitForTx(await exchange.addLiquidity(tokenAmount, {
            value: ethAmount
        }));

        exchangeEthBalance = await getBalance(exchange.address);
        exchangeTokenBalance = await token.balanceOf(exchange.address);
        ownerEthBalance = await getBalance(owner.address);
        ownerTokenBalance = await token.balanceOf(owner.address);
        lpTokenBalance = await exchange.balanceOf(owner.address);
    });

    describe("addLiquidity", async () => {
        it("Adds Liquidity With Zero Reserves", async () => {
            expect(await getBalance(exchange.address)).to.equal(ethAmount);
            expect(await exchange.getReserves()).to.equal(tokenAmount);
        });

        it("Adds Liquidity With Reserves", async () => {
            const tokensToAdd = "1"
            const currentRatio = Number(fromWei(exchangeEthBalance)) / Number(fromWei(exchangeTokenBalance));

            const tx1 = await helper.waitForTx(await token.approve(exchange.address, toWei(tokensToAdd)));
            const tx2 = await helper.waitForTx(await exchange.addLiquidity(toWei(tokensToAdd), {
                value: toWei((Number(tokensToAdd) * currentRatio).toString())
            }));
            const ethSpentOnGas = tx2.gasUsed.mul(tx2.effectiveGasPrice).add(tx1.gasUsed.mul(tx1.effectiveGasPrice));

            // Test all balances to ensure correctness
            // Owner token balance
            expect(await token.balanceOf(owner.address)).to.equal(ownerTokenBalance.sub(toWei(tokensToAdd)))
            // Owner eth balance, accounting for gas payments
            expect(await getBalance(owner.address)).to.equal(ownerEthBalance.sub(BigNumber.from(toWei((Number(tokensToAdd) * currentRatio).toString()))).sub(ethSpentOnGas));
            // Exchange eth balance
            expect(await getBalance(exchange.address)).to.equal(exchangeEthBalance.add(toWei((Number(tokensToAdd) * currentRatio).toString())));
            // Exchange token balance
            expect(await exchange.getReserves()).to.equal(exchangeTokenBalance.add(toWei(tokensToAdd)));
        });

        it("Reverts when ratio is incorrect", async () => {
            await helper.waitForTx(await token.approve(exchange.address, toWei('1')));
            await expect(exchange.addLiquidity(toWei('1'), {
                value: toWei('50')
            })).to.be.revertedWith('Liquidity ratio is not equal to current exchange ratio');

            expect(await token.balanceOf(exchange.address)).to.equal(exchangeTokenBalance);
            expect(await getBalance(exchange.address)).to.equal(exchangeEthBalance);
            expect(await token.balanceOf(owner.address)).to.equal(ownerTokenBalance);

        });
    });

    describe("getTokenAmounts", async () => {
        it("Returns amount of token for given amount of eth traded", async () => {
            const inputWithFee = BigNumber.from(toWei('1')).mul(BigNumber.from('99'));
            const numerator = inputWithFee.mul(exchangeTokenBalance);
            const denominator = BigNumber.from(exchangeEthBalance).mul(BigNumber.from('100')).add(inputWithFee);
            const expected = numerator.div(denominator);
            expect(await exchange.getTokenAmount(toWei('1'), false)).to.equal(expected);
        });

        it("Returns amount of eth for given amount of token traded", async () => {
            const inputWithFee = BigNumber.from(toWei('1')).mul('99');
            const numerator = inputWithFee.mul(exchangeEthBalance);
            const denominator = exchangeTokenBalance.mul(BigNumber.from('100')).add(inputWithFee);
            const expected = numerator.div(denominator);
            expect(await exchange.getEthAmount(toWei('1'))).to.equal(expected);
        });
    });

    describe("tokenSwaps", async () => {
        it("Sends correct amount of tokens when sent eth", async () => {
            const expectedSwap = await exchange.getTokenAmount(toWei('1'), false);
            const expectedTotal = ownerTokenBalance.add(expectedSwap);

            await helper.waitForTx(await exchange.ethToTokenSwap(expectedSwap, {
                value: toWei('1')
            }));

            expect(await token.balanceOf(owner.address)).to.equal(expectedTotal);
        });

        it("Sends correct amount of eth when sent tokens", async () => {
            const expectedSwap = await exchange.getEthAmount(toWei('1'));
            const expectedTotal = ownerEthBalance.add(expectedSwap);

            const tx1 = await helper.waitForTx(await token.approve(exchange.address, toWei('1')));
            const tx2 = await helper.waitForTx(await exchange.tokenToEthSwap(toWei('1'), 0));
            const ethSpentOnGas = tx2.gasUsed.mul(tx2.effectiveGasPrice).add(tx1.gasUsed.mul(tx1.effectiveGasPrice));

            expect(await getBalance(owner.address)).to.equal(expectedTotal.sub(ethSpentOnGas));
        });
    });

    describe("LP Tokens", async () => {
        it("Mints correct amount while exchange has zero reserves", async () => {
            expect(await exchange.balanceOf(owner.address)).to.equal(ethAmount);
        });

        it("Mints correct amount while reserves are not zero", async () => {
            await token.approve(exchange.address, toWei('2'));
            await exchange.addLiquidity(toWei('2'), {
                value: toWei('1')
            });
            const expectedMint = 5 * (1 / 6);

            // Added 33 becuase solidity math != BigNumber math... Switch to foundry for testing!!
            expect(await exchange.balanceOf(owner.address)).to.equal(ethAmount.add(toWei(expectedMint.toString())).add(BigNumber.from('33')));
        });
    });

    describe("removeLiquidity", async () => {
        it('removes liquidity', async () => {
            const lpRemoved = toWei('1')
            const expectedOutputs = await exchange.callStatic.removeLiquidity(lpRemoved);
            const tx1 = await helper.waitForTx(await exchange.approve(exchange.address, lpRemoved));
            const tx2 = await helper.waitForTx(await exchange.removeLiquidity(lpRemoved));
            const spentOnGas = await helper.spentOnGas(tx1, tx2);

            expect(await getBalance(owner.address)).to.equal((ownerEthBalance).add(await expectedOutputs[0]).sub(spentOnGas));
            expect(await exchange.balanceOf(owner.address)).to.equal(lpTokenBalance.sub(lpRemoved));
            expect(await token.balanceOf(owner.address)).to.equal(ownerTokenBalance.add(expectedOutputs[1]));

            expect(await getBalance(exchange.address)).to.equal(exchangeEthBalance.sub(expectedOutputs[0]));
            expect(await token.balanceOf(exchange.address)).to.equal(exchangeTokenBalance.sub(expectedOutputs[1]));
        });
    });
}); 
