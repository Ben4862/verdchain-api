import { Router } from "express";
import {
  registerUniversity,
  loginUniversity,
  getPendingUniversities,
  approveUniversity,
  rejectUniversity,
} from "../services/registry.js";

export const universitiesRouter = Router();

function adminAuth(req, res, next) {
  const secret = req.headers["x-admin-secret"];
  const expected = process.env.ADMIN_SECRET;
  if (!expected || !secret || secret !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

universitiesRouter.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }
  try {
    const uni = registerUniversity({ name, email, password });
    return res.status(201).json({ status: "pending", id: uni.id, name: uni.name });
  } catch (err) {
    if (err.message === "email_taken") return res.status(409).json({ error: "email_already_registered" });
    throw err;
  }
});

universitiesRouter.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });
  const uni = loginUniversity({ email, password });
  if (!uni) return res.status(401).json({ error: "invalid_credentials" });
  if (uni.status === "pending") return res.status(403).json({ error: "pending_approval" });
  if (uni.status === "rejected") return res.status(403).json({ error: "account_rejected" });
  const token = `${uni.id}:${uni.passwordHash}`;
  return res.json({ token, university: { id: uni.id, name: uni.name, email: uni.email } });
});

universitiesRouter.get("/pending", adminAuth, (req, res) => {
  const list = getPendingUniversities().map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt,
  }));
  return res.json({ universities: list });
});

universitiesRouter.post("/:id/approve", adminAuth, (req, res) => {
  const uni = approveUniversity(req.params.id);
  if (!uni) return res.status(404).json({ error: "not_found" });
  return res.json({ status: "approved", id: uni.id, name: uni.name });
});

universitiesRouter.post("/:id/reject", adminAuth, (req, res) => {
  const uni = rejectUniversity(req.params.id);
  if (!uni) return res.status(404).json({ error: "not_found" });
  return res.json({ status: "rejected", id: uni.id, name: uni.name });
});
