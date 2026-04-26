import { Router } from "express";
import crypto from "crypto";
import { ethers } from "ethers";
import { anchorEvidence } from "../services/blockchain.js";
import { generateVerifyQR } from "../services/qr.js";

export const anchorFileRouter = Router();

anchorFileRouter.post("/", async function(req, res, next) {
  try {
    var chunks = [];
    req.on("data", function(chunk) { chunks.push(chunk); });
    req.on("end", async function() {
      try {
        var buffer = Buffer.concat(chunks);
        if (!buffer || buffer.length === 0) {
          return res.status(400).json({ error: "no_file" });
        }
        var hexHash = "0x" + crypto.createHash("sha256").update(buffer).digest("hex");
        var key = process.env.OPERATOR_PRIVATE_KEY;
        var wallet = new ethers.Wallet(key);
        var msgBytes = ethers.getBytes(hexHash);
        var sig = await wallet.signMessage(msgBytes);
        var metadata = { filename: "capture.jpg", file_size: buffer.length, captured_at: new Date().toISOString(), source: "ios_shortcut" };
        var result = await anchorEvidence(hexHash, sig, metadata);
        var qr = await generateVerifyQR(hexHash);
        return res.status(201).json({ status: "anchored", hash: hexHash, txHash: result.txHash, verifyUrl: qr.url });
      } catch (e) { next(e); }
    });
  } catch (err) { next(err); }
});
