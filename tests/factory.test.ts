import "@nomiclabs/hardhat-waffle";
import * as helper from "../scripts/helpful_scripts";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";


describe("Factory", async () => {
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let factory: Contract;
    let exchangeSnail: Contract;
    let exchangeToucan: Contract;
    let snail: Contract;
    let toucan: Contract;


    beforeEach(async () => {
        [owner, user] = await ethers.getSigners();
        factory = await helper.deployContract("Factory");
        snail = await helper.deployContract("Token", "Snail", "SNL", helper.toWei('10000'));
        toucan = await helper.deployContract("Token", "Toucan", "TC", helper.toWei('10000'));
        await helper.waitForTx(await factory.createExchange(snail.address));
        await helper.waitForTx(await factory.createExchange(toucan.address));
        exchangeSnail = await helper.getContractAt("Exchange", await factory.getExchange(snail.address));
        exchangeToucan = await helper.getContractAt("Exchange", await factory.getExchange(toucan.address));


    });

    describe("createExchange", async () => {
        it("Deploys New Exchange", async () => {
            expect(await exchangeSnail.tokenAddress()).to.equal(snail.address);
        });
    });

    beforeEach(async () => {
        await helper.waitForTx(await snail.approve(exchangeSnail.address, helper.toWei('1000')));
        await helper.waitForTx(await exchangeSnail.addLiquidity(helper.toWei('1000'), {
            value: helper.toWei('500')
        }));

        await helper.waitForTx(await toucan.approve(exchangeToucan.address, helper.toWei('1000')));
        await helper.waitForTx(await exchangeToucan.addLiquidity(helper.toWei('1000'), {
            value: helper.toWei('500')
        }));
    });

    describe("tokenToTokenSwap", async () => {
        it("Trades One Token For Another", async () => {
            const ethToTrade = await exchangeSnail.getEthAmount(helper.toWei('1'));
            const tokensExpected = await exchangeToucan.getTokenAmount(await ethToTrade, false);
            const priorSnail = await snail.balanceOf(owner.address);
            const priorToucan = await toucan.balanceOf(owner.address);

            await helper.waitForTx(await snail.approve(exchangeSnail.address, helper.toWei('1')));
            await helper.waitForTx(await exchangeSnail.tokenToTokenSwap(toucan.address, helper.toWei('1'), await tokensExpected));

            expect(await snail.balanceOf(owner.address)).to.equal(priorSnail.sub(helper.toWei('1')));
            expect(await toucan.balanceOf(owner.address)).to.equal(priorToucan.add(tokensExpected));


        });
    });
});