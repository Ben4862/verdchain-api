import { Router } from "express";
import { checkConnection, getTotalAnchored } from "../services/blockchain.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const chain = await checkConnection();
  const total = chain.ok ? await getTotalAnchored().catch(() => null) : null;

  return res.status(chain.ok ? 200 : 503).json({
    status:        chain.ok ? "ok" : "degraded",
    timestamp:     new Date().toISOString(),
    api:           { ok: true, version: "1.0.0" },
    blockchain:    chain,
    totalAnchored: total,
  });
});
