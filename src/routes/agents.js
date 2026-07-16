import { Router }  from "express";
import multer     from "multer";
import crypto     from "crypto";
import { ethers } from "ethers";
import { jwtAuth } from "../middleware/jwtAuth.js";
import { getIssuer } from "../services/registry.js";
import { anchorEvidence, verifyEvidence } from "../services/blockchain.js";
import { generateVerifyQR } from "../services/qr.js";
import { normaliseHash } from "../utils/validate.js";
import {
  recordIdentity, getIdentities, getIdentityByHash,
  revokeIdentity, isRevoked, getRevokeInfo,
} from "../services/identityStore.js";

export const agentsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// POST /api/agents/anchor
// L'artefact envoyé (manifeste, archive du code source, empreintes des poids)
// est haché en SHA-256 puis ancré sur Ethereum — l'artefact lui-même n'est jamais conservé.
agentsRouter.post("/anchor", jwtAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (req.user.role !== "issuer") return res.status(403).json({ error: "Accès refusé" });
    if (!req.file)                  return res.status(400).json({ error: "Artefact manquant" });

    const { agent_name, agent_version, model_info, release_date } = req.body;
    if (!agent_name || !agent_version || !release_date)
      return res.status(400).json({ error: "Champs obligatoires manquants" });

    const hashHex = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
    const hash    = "0x" + hashHex;

    const key = process.env.OPERATOR_PRIVATE_KEY;
    if (!key) return res.status(500).json({ error: "server_misconfigured" });

    const wallet = new ethers.Wallet(key);
    const sig    = await wallet.signMessage(ethers.getBytes(hash));
    const issuer = getIssuer(req.user.issuerId);

    const metadata = {
      type: "ai_agent_identity",
      issuerId: req.user.issuerId, creatorName: issuer?.name || "",
      agent_name, agent_version, model_info: model_info || "", release_date,
    };

    const result          = await anchorEvidence(hash, sig, metadata);
    const { url: verifyUrl } = await generateVerifyQR(hash);

    recordIdentity(req.user.issuerId, {
      hash, agent_name, agent_version, model_info: model_info || "", release_date,
      anchoredAt: new Date().toISOString(),
      txHash: result.txHash, issuerName: issuer?.name,
    });

    return res.status(201).json({
      status: "anchored",
      hash,
      agent:  { agent_name, agent_version, model_info: model_info || "", release_date },
      txHash: result.txHash,
      verifyUrl,
      issuer: { name: issuer?.name },
    });
  } catch (err) {
    if (err.message?.includes("AlreadyAnchored"))
      return res.status(409).json({ error: "already_anchored" });
    next(err);
  }
});

// GET /api/agents/verify/:hex
agentsRouter.get("/verify/:hex", async (req, res, next) => {
  try {
    const hash   = normaliseHash(req.params.hex);
    const result = await verifyEvidence(hash, { full: true });

    if (!result.exists) return res.json({ status: "not_found", hash });

    if (isRevoked(hash)) {
      const ri = getRevokeInfo(hash);
      return res.json({ status: "revoked", hash, revokedAt: ri.revokedAt });
    }

    const stored = getIdentityByHash(hash);
    return res.json({
      status: "verified",
      hash,
      agent: stored ? {
        agent_name:    stored.agent_name,
        agent_version: stored.agent_version,
        model_info:    stored.model_info,
        release_date:  stored.release_date,
        anchored_at:   stored.anchoredAt,
      } : { anchored_at: result.timestamp },
      issuer: stored ? { name: stored.issuerName } : null,
    });
  } catch (err) { next(err); }
});

// GET /api/agents/history
agentsRouter.get("/history", jwtAuth, (req, res) => {
  if (req.user.role !== "issuer") return res.status(403).json({ error: "Accès refusé" });
  res.json({ agents: getIdentities(req.user.issuerId) });
});

// PUT /api/agents/:hash/revoke
agentsRouter.put("/:hash/revoke", jwtAuth, (req, res) => {
  if (req.user.role !== "issuer") return res.status(403).json({ error: "Accès refusé" });
  const hash   = req.params.hash;
  const reason = req.body?.reason || "";
  try {
    revokeIdentity(hash, req.user.issuerId, reason);
    res.json({ status: "revoked", hash, revokedAt: new Date().toISOString() });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});
