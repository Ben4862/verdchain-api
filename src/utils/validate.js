import { ethers } from "ethers";

export function validateHash(hash) {
  if (!hash || typeof hash !== "string") return false;
  const h = hash.startsWith("0x") ? hash : "0x" + hash;
  return /^0x[0-9a-fA-F]{64}$/.test(h);
}

export function normaliseHash(hash) {
  if (!hash) throw new Error("Hash is required");
  const h = hash.startsWith("0x") ? hash : "0x" + hash;
  if (!validateHash(h)) throw new Error(`Invalid hash: ${hash}`);
  return h.toLowerCase();
}

export function validateSignature(sig) {
  if (!sig || typeof sig !== "string") return false;
  const s = sig.startsWith("0x") ? sig : "0x" + sig;
  return /^0x[0-9a-fA-F]{130}$/.test(s);
}

export function validateAddress(addr) {
  try { ethers.getAddress(addr); return true; }
  catch { return false; }
}

export function sanitiseMetadata(meta) {
  if (!meta || typeof meta !== "object") return {};
  const allowed = ["device_id", "filename", "file_size", "captured_at",
                   "captured_ts", "gps", "device_os", "hostname", "schema", "source"];
  const clean = {};
  for (const key of allowed) {
    if (meta[key] !== undefined) clean[key] = meta[key];
  }
  return clean;
}
