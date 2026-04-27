const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const ABI = [];
const BYTECODE = "0x" + require("child_process").execSync(
  "npx solc --bin contracts/EvidenceAnchor.sol --output-dir /tmp/sol --overwrite 2>/dev/null && cat /tmp/sol/EvidenceAnchor.bin"
).toString().trim();

async function main() {
  const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  console.log("Deploying from:", wallet.address);
  const factory = new ethers.ContractFactory(ABI, BYTECODE, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  console.log("Contract deployed to:", await contract.getAddress());
}

main().catch(console.error);
