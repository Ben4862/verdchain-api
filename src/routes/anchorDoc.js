import { Router } from "express";
import { ethers } from "ethers";
import { anchorEvidence } from "../services/blockchain.js";
import { generateVerifyQR } from "../services/qr.js";
import { normaliseHash } from "../utils/validate.js";
import { uniAuth } from "../middleware/uniAuth.js";

export const anchorDocRouter = Router();

anchorDocRouter.post("/", uniAuth, async (req, res, next) => {
  try {
    const { hash, candidateName, date } = req.body;
    if (!hash) return res.status(400).json({ error: "hash is required" });
    if (!candidateName) return res.status(400).json({ error: "candidateName is required" });
    if (!date) return res.status(400).json({ error: "date is required" });

    const hexHash = normaliseHash(hash);
    const key = process.env.OPERATOR_PRIVATE_KEY;
    if (!key) return res.status(500).json({ error: "server_misconfigured" });

    const wallet = new ethers.Wallet(key);
    const sig = await wallet.signMessage(ethers.getBytes(hexHash));

    const metadata = {
      type: "academic_credential",
      universityId: req.university.id,
      universityName: req.university.name,
      candidateName,
      date,
    };

    const result = await anchorEvidence(hexHash, sig, metadata);
    const qr = await generateVerifyQR(hexHash);

    return res.status(201).json({
      status: "anchored",
      hash: hexHash,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      verifyUrl: qr.url,
      universityName: req.university.name,
      candidateName,
      date,
    });
  } catch (err) {
    if (err.message?.includes("AlreadyAnchored")) {
      return res.status(409).json({ error: "already_anchored" });
    }
    next(err);
  }
});
