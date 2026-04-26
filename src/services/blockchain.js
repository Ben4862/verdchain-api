import { ethers } from "ethers";

const ABI = [
  "function anchor(bytes32 hash, bytes calldata signature, string calldata metadata) external",
  "function verify(bytes32 hash) external view returns (bool exists, address signer, address custodian, uint256 anchoredAt)",
  "function getRecord(bytes32 hash) external view returns (tuple(bytes32 hash, address signer, address custodian, uint256 anchoredAt, uint256 blockNumber, string metadata))",
  "function getCustodyLog(bytes32 hash) external view returns (tuple(address from, address to, uint256 timestamp, string note)[])",
  "function totalAnchored() external view returns (uint256)",
];

let _provider = null;

export function getProvider() {
  if (!_provider) {
    const rpc = process.env.POLYGON_RPC_URL;
    if (!rpc) throw new Error("POLYGON_RPC_URL not set");
    _provider = new ethers.JsonRpcProvider(rpc);
  }
  return _provider;
}

export function getSigner() {
  const key = process.env.OPERATOR_PRIVATE_KEY;
  if (!key) throw new Error("OPERATOR_PRIVATE_KEY not set");
  return new ethers.Wallet(key, getProvider());
}

export function getContract(withSigner = false) {
  const addr = process.env.CONTRACT_ADDRESS;
  if (!addr) throw new Error("CONTRACT_ADDRESS not set");
  const runner = withSigner ? getSigner() : getProvider();
  return new ethers.Contract(addr, ABI, runner);
}

export async function anchorEvidence(hexHash, signature, metadata) {
  const contract = getContract(true);
  const metaStr = typeof metadata === "string" ? metadata : JSON.stringify(metadata);
  const gasEstimate = await contract.anchor.estimateGas(hexHash, signature, metaStr);
  const gasLimit = (gasEstimate * 120n) / 100n;
  const tx = await contract.anchor(hexHash, signature, metaStr, { gasLimit });
  const receipt = await tx.wait(1);
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    anchoredAt: Math.floor(Date.now() / 1000),
  };
}

export async function verifyEvidence(hexHash, { full = false } = {}) {
  const contract = getContract();
  const [exists, signer, custodian, anchoredAt] = await contract.verify(hexHash);
  if (!exists) return { exists: false };
  const result = {
    exists: true,
    signer,
    custodian,
    anchoredAt: Number(anchoredAt),
    anchoredAtISO: new Date(Number(anchoredAt) * 1000).toISOString(),
  };
  if (full) {
    const [record, log] = await Promise.all([
      contract.getRecord(hexHash),
      contract.getCustodyLog(hexHash),
    ]);
    result.record = {
      hash: record.hash,
      signer: record.signer,
      blockNumber: Number(record.blockNumber),
      metadata: (() => { try { return JSON.parse(record.metadata); } catch (e) { return record.metadata; } })(),
    };
    result.custodyLog = log.map(function(e) {
      return {
        from: e.from,
        to: e.to,
        timestamp: Number(e.timestamp),
        timestampISO: new Date(Number(e.timestamp) * 1000).toISOString(),
        note: e.note,
      };
    });
  }
  return result;
}

export async function getTotalAnchored() {
  const contract = getContract();
  return Number(await contract.totalAnchored());
}

export async function checkConnection() {
  try {
    const provider = getProvider();
    const block = await provider.getBlockNumber();
    const network = await provider.getNetwork();
    return { ok: true, blockNumber: block, chainId: Number(network.chainId) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
