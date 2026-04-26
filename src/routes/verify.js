import { Router } from "express";
import { verifyEvidence } from "../services/blockchain.js";
import { generateVerifyQR } from "../services/qr.js";
import { normaliseHash } from "../utils/validate.js";

export const verifyRouter = Router();

verifyRouter.get("/:hash", async (req, res, next) => {
  try {
    const hexHash = normaliseHash(req.params.hash);
    const full    = req.query.full === "true";
    const result  = await verifyEvidence(hexHash, { full });
    const { url: verifyUrl, qrDataUrl } = await generateVerifyQR(hexHash);

    return res.status(200).json({
      status:  result.exists ? "verified" : "not_found",
      hash:    hexHash,
      exists:  result.exists,
      ...result,
      verifyUrl,
      qrDataUrl,
    });
  } catch (err) {
    next(err);
  }
});

verifyRouter.post("/", async (req, res, next) => {
  try {
    const { hash, full } = req.body;
    if (!hash) return res.status(400).json({ error: "hash is required" });

    const hexHash = normaliseHash(hash);
    const result  = await verifyEvidence(hexHash, { full: !!full });
    const { url: verifyUrl, qrDataUrl } = await generateVerifyQR(hexHash);

    return res.status(200).json({
      status:  result.exists ? "verified" : "not_found",
      hash:    hexHash,
      exists:  result.exists,
      ...result,
      verifyUrl,
      qrDataUrl,
    });
  } catch (err) {
    next(err);
  }
});
