import "@nomiclabs/hardhat-waffle";
import * as helper from "../scripts/helpful_scripts";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

const getBalance = ethers.provider.getBalance;
const toWei = (value: any) =>
    ethers.utils.parseEther(value.toString());
const fromWei = (value: any) =>
    ethers.utils.formatEther(BigNumber.from(value.toString()));

describe("Factory", async () => {
    const owner = ethers.getSigners();
    const Factory = helper.deployContract("Factory");



    beforeEach(async () => {

    });


});