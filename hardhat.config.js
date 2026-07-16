require("@nomicfoundation/hardhat-ethers");

module.exports = {
  solidity: "0.8.20",
  networks: {
    ethereum: {
      url: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 1,
    },
  },
};
