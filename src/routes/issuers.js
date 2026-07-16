import { Router } from "express";
import {
  registerIssuer,
  loginIssuer,
  getPendingIssuers,
  approveIssuer,
  rejectIssuer,
} from "../services/registry.js";

export const issuersRouter = Router();

function adminAuth(req, res, next) {
  const secret = req.headers["x-admin-secret"];
  const expected = process.env.ADMIN_SECRET;
  if (!expected || !secret || secret !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

issuersRouter.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }
  try {
    const issuer = registerIssuer({ name, email, password });
    return res.status(201).json({ status: "pending", id: issuer.id, name: issuer.name });
  } catch (err) {
    if (err.message === "email_taken") return res.status(409).json({ error: "email_already_registered" });
    throw err;
  }
});

issuersRouter.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });
  const issuer = loginIssuer({ email, password });
  if (!issuer) return res.status(401).json({ error: "invalid_credentials" });
  if (issuer.status === "pending") return res.status(403).json({ error: "pending_approval" });
  if (issuer.status === "rejected") return res.status(403).json({ error: "account_rejected" });
  const token = `${issuer.id}:${issuer.passwordHash}`;
  return res.json({ token, issuer: { id: issuer.id, name: issuer.name, email: issuer.email } });
});

issuersRouter.get("/pending", adminAuth, (req, res) => {
  const list = getPendingIssuers().map(i => ({
    id: i.id,
    name: i.name,
    email: i.email,
    createdAt: i.createdAt,
  }));
  return res.json({ issuers: list });
});

issuersRouter.post("/:id/approve", adminAuth, (req, res) => {
  const issuer = approveIssuer(req.params.id);
  if (!issuer) return res.status(404).json({ error: "not_found" });
  return res.json({ status: "approved", id: issuer.id, name: issuer.name });
});

issuersRouter.post("/:id/reject", adminAuth, (req, res) => {
  const issuer = rejectIssuer(req.params.id);
  if (!issuer) return res.status(404).json({ error: "not_found" });
  return res.json({ status: "rejected", id: issuer.id, name: issuer.name });
});
