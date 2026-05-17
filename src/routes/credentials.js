import { Router }  from "express";
import multer     from "multer";
import crypto     from "crypto";
import { ethers } from "ethers";
import { jwtAuth } from "../middleware/jwtAuth.js";
import { getUniversity } from "../services/registry.js";
import { anchorEvidence, verifyEvidence } from "../services/blockchain.js";
import { generateVerifyQR } from "../services/qr.js";
import { normaliseHash } from "../utils/validate.js";
import {
  recordCredential, getCredentials, getCredentialByHash,
  revokeCredential, isRevoked, getRevokeInfo,
} from "../services/credentialStore.js";

export const credentialsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// POST /api/credentials/anchor
credentialsRouter.post("/anchor", jwtAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (req.user.role !== "issuer") return res.status(403).json({ error: "Accès refusé" });
    if (!req.file)                  return res.status(400).json({ error: "Fichier manquant" });

    const { candidate_name, degree_type, issued_date } = req.body;
    if (!candidate_name || !degree_type || !issued_date)
      return res.status(400).json({ error: "Champs obligatoires manquants" });

    const hashHex = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
    const hash    = "0x" + hashHex;

    const key = process.env.OPERATOR_PRIVATE_KEY;
    if (!key) return res.status(500).json({ error: "server_misconfigured" });

    const wallet = new ethers.Wallet(key);
    const sig    = await wallet.signMessage(ethers.getBytes(hash));
    const uni    = getUniversity(req.user.uniId);

    const metadata = {
      type: "credential",
      universityId: req.user.uniId, universityName: uni?.name || "",
      candidate_name, degree_type, issued_date,
    };

    const result          = await anchorEvidence(hash, sig, metadata);
    const { url: verifyUrl } = await generateVerifyQR(hash);

    recordCredential(req.user.uniId, {
      hash, candidate_name, degree_type, issued_date,
      anchoredAt: new Date().toISOString(),
      txHash: result.txHash, issuerName: uni?.name,
    });

    return res.status(201).json({
      status: "anchored",
      hash,
      credential:  { candidate_name, degree_type, issued_date },
      txHash:      result.txHash,
      verifyUrl,
      issuer:      { name: uni?.name },
    });
  } catch (err) {
    if (err.message?.includes("AlreadyAnchored"))
      return res.status(409).json({ error: "already_anchored" });
    next(err);
  }
});

// GET /api/credentials/verify/:hex
credentialsRouter.get("/verify/:hex", async (req, res, next) => {
  try {
    const hash   = normaliseHash(req.params.hex);
    const result = await verifyEvidence(hash, { full: true });

    if (!result.exists) return res.json({ status: "not_found", hash });

    if (isRevoked(hash)) {
      const ri = getRevokeInfo(hash);
      return res.json({ status: "revoked", hash, revokedAt: ri.revokedAt });
    }

    const stored = getCredentialByHash(hash);
    return res.json({
      status: "verified",
      hash,
      credential: stored ? {
        candidate_name: stored.candidate_name,
        degree_type:    stored.degree_type,
        issued_date:    stored.issued_date,
        anchored_at:    stored.anchoredAt,
      } : { anchored_at: result.timestamp },
      issuer: stored ? { name: stored.issuerName } : null,
    });
  } catch (err) { next(err); }
});

// GET /api/credentials/history
credentialsRouter.get("/history", jwtAuth, (req, res) => {
  if (req.user.role !== "issuer") return res.status(403).json({ error: "Accès refusé" });
  res.json({ credentials: getCredentials(req.user.uniId) });
});

// PUT /api/credentials/:hash/revoke
credentialsRouter.put("/:hash/revoke", jwtAuth, (req, res) => {
  if (req.user.role !== "issuer") return res.status(403).json({ error: "Accès refusé" });
  const hash   = req.params.hash;
  const reason = req.body?.reason || "";
  try {
    revokeCredential(hash, req.user.uniId, reason);
    res.json({ status: "revoked", hash, revokedAt: new Date().toISOString() });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});
