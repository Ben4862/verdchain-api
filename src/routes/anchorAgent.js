import { Router } from "express";
import { ethers } from "ethers";
import { anchorEvidence } from "../services/blockchain.js";
import { generateVerifyQR } from "../services/qr.js";
import { normaliseHash } from "../utils/validate.js";
import { issuerAuth } from "../middleware/issuerAuth.js";

export const anchorAgentRouter = Router();

anchorAgentRouter.post("/", issuerAuth, async (req, res, next) => {
  try {
    const { hash, agentName, agentVersion, releaseDate } = req.body;
    if (!hash) return res.status(400).json({ error: "hash is required" });
    if (!agentName) return res.status(400).json({ error: "agentName is required" });
    if (!releaseDate) return res.status(400).json({ error: "releaseDate is required" });

    const hexHash = normaliseHash(hash);
    const key = process.env.OPERATOR_PRIVATE_KEY;
    if (!key) return res.status(500).json({ error: "server_misconfigured" });

    const wallet = new ethers.Wallet(key);
    const sig = await wallet.signMessage(ethers.getBytes(hexHash));

    const metadata = {
      type: "ai_agent_identity",
      issuerId: req.issuer.id,
      creatorName: req.issuer.name,
      agentName,
      agentVersion: agentVersion || "",
      releaseDate,
    };

    const result = await anchorEvidence(hexHash, sig, metadata);
    const qr = await generateVerifyQR(hexHash);

    return res.status(201).json({
      status: "anchored",
      hash: hexHash,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      verifyUrl: qr.url,
      creatorName: req.issuer.name,
      agentName,
      agentVersion: agentVersion || "",
      releaseDate,
    });
  } catch (err) {
    if (err.message?.includes("AlreadyAnchored")) {
      return res.status(409).json({ error: "already_anchored" });
    }
    next(err);
  }
});
