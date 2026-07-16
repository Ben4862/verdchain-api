import { Router }  from "express";
import { jwtAuth } from "../middleware/jwtAuth.js";
import { getAuditLog } from "../services/identityStore.js";

export const auditRouter = Router();

auditRouter.get("/log", jwtAuth, (req, res) => {
  if (req.user.role !== "issuer") return res.status(403).json({ error: "Accès refusé" });
  res.json({ log: getAuditLog(req.user.issuerId) });
});
