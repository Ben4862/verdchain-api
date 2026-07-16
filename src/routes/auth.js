import { Router } from "express";
import jwt       from "jsonwebtoken";
import { loginIssuer, registerIssuer } from "../services/registry.js";
import { addAuditEntry } from "../services/identityStore.js";

export const authRouter = Router();

const SECRET      = process.env.JWT_SECRET   || "verdchain-dev-secret";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL  || "admin@verdchain.com";
const ADMIN_PASS  = process.env.ADMIN_PASS   || "admin-secret";

authRouter.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Champs manquants" });

  if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
    const token = jwt.sign({ role: "admin", email }, SECRET, { expiresIn: "8h" });
    return res.json({ token, user: { role: "admin", email } });
  }

  const issuer = loginIssuer({ email, password });
  if (!issuer) return res.status(401).json({ error: "Identifiants incorrects" });

  addAuditEntry(issuer.id, "login", { email });

  const token = jwt.sign({ role: "issuer", issuerId: issuer.id, email: issuer.email }, SECRET, { expiresIn: "8h" });
  return res.json({
    token,
    issuer: { org_name: issuer.name, email: issuer.email, status: issuer.status },
  });
});

authRouter.post("/register", (req, res) => {
  const { email, password, org_name, sector, website } = req.body;
  if (!email || !password || !org_name)
    return res.status(400).json({ error: "Champs obligatoires manquants" });
  try {
    const issuer = registerIssuer({ name: org_name, email, password, sector, website });
    return res.status(201).json({ message: "Demande soumise. En attente de validation.", id: issuer.id });
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
});
