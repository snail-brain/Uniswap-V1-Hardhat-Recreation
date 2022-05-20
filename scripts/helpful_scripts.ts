import { ethers } from "hardhat";
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();
const network = "rinkeby"

export const provider = ethers.getDefaultProvider(network, {
    etherscan: process.env.ETHERSCAN_KEY,
    alchemy: process.env.ALCHEMY_KEY
})

export async function deployContract(name: string, ...args: any[]) {
    const factory = await ethers.getContractFactory(name);
    const deployed = factory.deploy(...args);
    return deployed;
}

export async function getContractAt(name: string, address: string) {
    const factory = await ethers.getContractFactory(name);
    const contract = factory.attach(address);
    return contract;
}

export async function waitForTx(tx: Promise<ContractTransaction>) {
    let x = await tx;
    const receipt = await x.wait();
    return receipt;
}

export async function spentOnGas(...args: ContractReceipt[]) {
    let total = BigNumber.from('0');
    for (const receipt in args) {
        const x = args[receipt].gasUsed.mul(args[receipt].effectiveGasPrice);
        total = total.add(x);
    }

    return total;
}


