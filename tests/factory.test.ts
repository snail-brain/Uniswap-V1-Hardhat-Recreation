import "@nomiclabs/hardhat-waffle";
import * as helper from "../scripts/helpful_scripts";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";


describe("Factory", async () => {
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let factory: Contract;
    let token: Contract;

    beforeEach(async () => {
        [owner, user] = await ethers.getSigners();
        factory = await helper.deployContract("Factory");
        token = await helper.deployContract("Token", "Snail", "SNL", helper.toWei('10000'));

    });


    describe("createExchange", async () => {
        it("Deploys New Exchange", async () => {
            await helper.waitForTx(await factory.createExchange(token.address));
            const factoryAddress = await factory.callStatic.getExchange(token.address);
            expect(factoryAddress).to.not.equal(ethers.constants.AddressZero);
            console.log(factoryAddress);
        });
    });
});