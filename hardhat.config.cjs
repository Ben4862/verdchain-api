require("@nomicfoundation/hardhat-ethers");

module.exports = {
  solidity: "0.8.20",
  networks: {
    polygon: {
      type: "http",
      url: "https://polygon-rpc.com",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 137,
    },
  },
};
