import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import { ethers } from "ethers";
import { anchorEvidence } from "../services/blockchain.js";
import { generateVerifyQR } from "../services/qr.js";

export const anchorFileRouter = Router();

const upload = multer({ storage: multer.memoryStorage() }).any();

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

anchorFileRouter.post("/", upload, async function(req, res, next) {
  try {
    var buffer;
    var filename = "capture.jpg";

    console.log("files:", req.files ? req.files.length : 0);
    console.log("body keys:", Object.keys(req.body || {}));
    console.log("content-type:", req.headers["content-type"]);

    if (req.files && req.files.length > 0) {
      buffer = req.files[0].buffer;
      filename = req.files[0].originalname || "capture.jpg";
    } else if (req.body && req.body.data) {
      buffer = Buffer.from(req.body.data, "base64");
    } else if (req.body && Object.keys(req.body).length > 0) {
      var firstKey = Object.keys(req.body)[0];
      var val = req.body[firstKey];
      if (typeof val === "string" && val.length > 100) {
        buffer = Buffer.from(val, "base64");
      }
    }

    if (!buffer) {
      console.log("no buffer found");
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
      verifyUrl
