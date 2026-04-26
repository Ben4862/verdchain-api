import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import { ethers } from "ethers";
import { anchorEvidence } from "../services/blockchain.js";
import { generateVerifyQR } from "../services/qr.js";

export const anchorFileRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });

function hashBuffer(buffer) {
  return "0x" + crypto.createHash("sha256").update(buffer).digest("hex");
}

async function signHash(hexHash) {
  const key = process.env.OPERATOR_PRIVATE_KEY;
  const wallet = new ethers.Wallet(key);
  const msgBytes = ethers.getBytes(hexHash);
  const sig = await wallet.signMessage(msgBytes);
  return { signer: wallet.address, signature: sig };
}

anchorFileRouter.post("/", upload.single("file"), async function(req, res, next) {
  try {
    var buffer;
    var filename;
    if (req.file) {
      buffer = req.file.buffer;
      filename = req.file.originalname || "capture.jpg";
    } else if (req.body && req.body.data) {
      buffer = Buffer.from(req.body.data, "base64");
      filename = req.body.filename || "capture.jpg";
    } else {
      return res.status(400).json({ error: "no_file" });
    }
    var hexHash = hashBuffer(buffer);
    var sig = await signHash(hexHash);
    var metadata = {
      filename: filename,
      file_size: buffer.length,
      captured_at: new Date().toISOString(),
      source: "ios_shortcut"
    };
    var result = await anchorEvidence(hexHash, sig.signature, metadata);
    var qr = await generateVerifyQR(hexHash);
    return res.status(201).json({
      status: "anchored",
      hash: hexHash,
      txHash: result.txHash,
      anchoredAt: new Date(result.anchoredAt * 1000).toISOString(),
      signer: sig.signer,
      filename: filename,
      verifyUrl: qr.url,
      qrDataUrl: qr.qrDataUrl
    });
  } catch (err) {
    next(err);
  }
});
