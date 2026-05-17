import { Router } from "express";
import crypto    from "crypto";
import { adminAuth } from "../middleware/jwtAuth.js";
import { getPendingUniversities, approveUniversity, rejectUniversity } from "../services/registry.js";

export const adminRouter = Router();
const inviteCodes = new Set();

adminRouter.get("/pending", adminAuth, (req, res) => {
  const issuers = getPendingUniversities().map(u => ({
    id: u.id, org_name: u.name, email: u.email, country: u.country || "",
  }));
  res.json({ issuers });
});

adminRouter.put("/approve/:id", adminAuth, (req, res) => {
  const uni = approveUniversity(req.params.id);
  if (!uni) return res.status(404).json({ error: "Organisme introuvable" });
  res.json({ status: "approved", id: req.params.id });
});

adminRouter.put("/reject/:id", adminAuth, (req, res) => {
  const uni = rejectUniversity(req.params.id);
  if (!uni) return res.status(404).json({ error: "Organisme introuvable" });
  res.json({ status: "rejected", id: req.params.id });
});

adminRouter.post("/invite", adminAuth, (req, res) => {
  const code = crypto.randomBytes(6).toString("hex").toUpperCase();
  inviteCodes.add(code);
  res.json({ code, register_url: `https://ben4862.github.io/verdchain/#register?invite=${code}` });
});
