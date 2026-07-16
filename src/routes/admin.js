import { Router } from "express";
import crypto    from "crypto";
import { adminAuth } from "../middleware/jwtAuth.js";
import { getPendingIssuers, approveIssuer, rejectIssuer } from "../services/registry.js";

export const adminRouter = Router();
const inviteCodes = new Set();

adminRouter.get("/pending", adminAuth, (req, res) => {
  const issuers = getPendingIssuers().map(i => ({
    id: i.id, org_name: i.name, email: i.email, sector: i.sector || "",
  }));
  res.json({ issuers });
});

adminRouter.put("/approve/:id", adminAuth, (req, res) => {
  const issuer = approveIssuer(req.params.id);
  if (!issuer) return res.status(404).json({ error: "Créateur introuvable" });
  res.json({ status: "approved", id: req.params.id });
});

adminRouter.put("/reject/:id", adminAuth, (req, res) => {
  const issuer = rejectIssuer(req.params.id);
  if (!issuer) return res.status(404).json({ error: "Créateur introuvable" });
  res.json({ status: "rejected", id: req.params.id });
});

adminRouter.post("/invite", adminAuth, (req, res) => {
  const code = crypto.randomBytes(6).toString("hex").toUpperCase();
  inviteCodes.add(code);
  res.json({ code, register_url: `https://ben4862.github.io/verdchain/#register?invite=${code}` });
});
