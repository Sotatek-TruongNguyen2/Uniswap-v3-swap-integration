require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');

require("dotenv").config();
require('solidity-coverage');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  solidity: {
    version: "0.8.7",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
    },
  },
  networks: {
    testnet: {
      url: "https://data-seed-prebsc-2-s1.binance.org:8545/",
      accounts: [process.env.PRIVATE_KEY],
    },
    bsc_mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: [process.env.PRIVATE_KEY],
    },
    mumbai: {
      url: `https://speedy-nodes-nyc.moralis.io/95b315e4271ce6f77d201815/polygon/mumbai/`,
      //url: `https://polygon-mumbai.g.alchemy.com/v2/zQw1WUC-FZSIsL1zGs9kYeGIbq7WJcET/`,
      chainId: 80001,
      accounts: [process.env.PRIVATE_KEY],
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.RINKEBY_INFURA_KEY}`,
      chainId: 4,
      accounts: [process.env.PRIVATE_KEY],
    }
  },
  etherscan: {
    apiKey: process.env.ETHEREUM_API_KEY,
  },
};