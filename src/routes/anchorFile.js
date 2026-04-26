import { Router }  from "express";
import multer      from "multer";
import crypto      from "crypto";
import { ethers }  from "ethers";
import { anchorEvidence }   from "../services/blockchain.js";
import { generateVerifyQR } from "../services/qr.js";

export const anchorFileRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 500 * 1024 * 1024 },
});

function getOperatorWallet() {
  const key = process.env.OPERATOR_PRIVATE_KEY;
  if (!key) throw new Error("OPERATOR_PRIVATE_KEY not set");
  return new ethers.Wallet(key);
}

function hashBuffer(buffer) {
  return "0x" + crypto.createHash("sha256").update(buffer).digest("hex");
}

async function signHash(hexHash) {
  const wallet   = getOperatorWallet();
  const msgBytes = ethers.getBytes(hexHash);
  const sig      = await wallet.signMessage(msgBytes);
  return { signer: wallet.address, signature: sig };
}

async function handleAnchorFile(fileBuffer, filename, extraMeta = {}) {
  const hexHash = hashBuffer(fileBuffer);
  const sig     = await signHash(hexHash);
  const metadata = {
    filename,
    file_size:   fileBuffer.length,
    captured_at: new Date().toISOString(),
    source:      "ios_shortcut",
    ...extraMeta,
  };
  const result = await anchorEvidence(hexHash, sig.signature, metadata);
  const { url: verifyUrl, qrDataUrl } = await generateVerifyQR(hexHash);
  return {
    status:      "anchored",
    hash:        hexHash,
    txHash:      result.txHash,
    anchoredAt:  new Date(result.anchoredAt * 1000).toISOString(),
    signer:      sig.signer,
    filename,
    verifyUrl,
    qrDataUrl,
  };
}

anchorFileRouter.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (req.file) {
      const result = await handleAnchorFile(req.file.buffer, req.file.originalname ||
