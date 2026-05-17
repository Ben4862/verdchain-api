import { Router } from "express";
import jwt       from "jsonwebtoken";
import { loginUniversity, registerUniversity } from "../services/registry.js";
import { addAuditEntry } from "../services/credentialStore.js";

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

  const uni = loginUniversity({ email, password });
  if (!uni) return res.status(401).json({ error: "Identifiants incorrects" });

  addAuditEntry(uni.id, "login", { email });

  const token = jwt.sign({ role: "issuer", uniId: uni.id, email: uni.email }, SECRET, { expiresIn: "8h" });
  return res.json({
    token,
    issuer: { org_name: uni.name, email: uni.email, status: uni.status },
  });
});

authRouter.post("/register", (req, res) => {
  const { email, password, org_name, country, website } = req.body;
  if (!email || !password || !org_name)
    return res.status(400).json({ error: "Champs obligatoires manquants" });
  try {
    const uni = registerUniversity({ name: org_name, email, password, country, website });
    return res.status(201).json({ message: "Demande soumise. En attente de validation.", id: uni.id });
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
});
