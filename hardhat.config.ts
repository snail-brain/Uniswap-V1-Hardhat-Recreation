import "@nomiclabs/hardhat-waffle";
import * as dotenv from "dotenv";

dotenv.config();
const alchemy_key = process.env.ALCHEMY_KEY;



export default {
  defaultNetwork: "hardhat",
  solidity: "0.8.0",
};
