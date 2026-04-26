import { Router } from "express";
import { anchorEvidence } from "../services/blockchain.js";
import { generateVerifyQR } from "../services/qr.js";
import { normaliseHash, validateSignature, sanitiseMetadata } from "../utils/validate.js";

export const anchorRouter = Router();

anchorRouter.post("/", async (req, res, next) => {
  try {
    const { hash, signature, metadata } = req.body;

    if (!hash)      return res.status(400).json({ error: "hash is required" });
    if (!signature) return res.status(400).json({ error: "signature is required" });

    const sigHex = typeof signature === "string" ? signature : signature.signature;

    if (!validateSignature(sigHex)) {
      return res.status(400).json({ error: "Invalid signature format" });
    }

    const hexHash   = normaliseHash(hash);
    const cleanMeta = sanitiseMetadata(metadata || {});
    const result    = await anchorEvidence(hexHash, sigHex, cleanMeta);
    const { url: verifyUrl, qrDataUrl } = await generateVerifyQR(hexHash);

    return res.status(201).json({
      status:      "anchored",
      hash:        hexHash,
      txHash:      result.txHash,
      blockNumber: result.blockNumber,
      anchoredAt:  result.anchoredAt,
      verifyUrl,
      qrDataUrl,
    });

  } catch (err) {
    if (err.message?.includes("AlreadyAnchored")) {
      return res.status(409).json({ error: "already_anchored" });
    }
    next(err);
  }
});
