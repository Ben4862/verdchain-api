import crypto from "crypto";

const issuers = new Map();

const demoId = "iss_novaagents_demo";
issuers.set(demoId, {
  id: demoId,
  name: "NovaAgents Labs",
  email: "dev@novaagents-demo.io",
  passwordHash: crypto.createHash("sha256").update("demo123").digest("hex"),
  status: "approved",
  sector: "Studio d'agents IA — Paris",
  website: "https://novaagents-demo.io",
  createdAt: new Date().toISOString(),
});

const pendingId = "iss_agenthub";
issuers.set(pendingId, {
  id: pendingId,
  name: "AgentHub — Plateforme d'orchestration",
  email: "certification@agenthub-demo.io",
  passwordHash: crypto.createHash("sha256").update("hub123").digest("hex"),
  status: "pending",
  sector: "Plateforme d'agents IA — Lyon",
  createdAt: new Date().toISOString(),
});

export function registerIssuer({ name, email, password, sector = "", website = "" }) {
  for (const issuer of issuers.values()) {
    if (issuer.email === email) throw Object.assign(new Error("email_taken"), { status: 409 });
  }
  const id = "iss_" + crypto.randomBytes(8).toString("hex");
  const issuer = {
    id, name, email,
    passwordHash: crypto.createHash("sha256").update(password).digest("hex"),
    status: "pending",
    sector, website,
    createdAt: new Date().toISOString(),
  };
  issuers.set(id, issuer);
  return issuer;
}

export function loginIssuer({ email, password }) {
  const ph = crypto.createHash("sha256").update(password).digest("hex");
  for (const issuer of issuers.values()) {
    if (issuer.email === email && issuer.passwordHash === ph) return issuer;
  }
  return null;
}

export function getPendingIssuers() {
  return [...issuers.values()].filter(i => i.status === "pending");
}

export function getIssuer(id) { return issuers.get(id); }

export function approveIssuer(id) {
  const issuer = issuers.get(id);
  if (!issuer) return null;
  issuer.status = "approved";
  return issuer;
}

export function rejectIssuer(id) {
  const issuer = issuers.get(id);
  if (!issuer) return null;
  issuers.delete(id);
  return issuer;
}
