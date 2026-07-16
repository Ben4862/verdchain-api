import { getIssuer } from "../services/registry.js";

export function issuerAuth(req, res, next) {
  const token = req.headers["x-issuer-token"];
  if (!token) return res.status(401).json({ error: "issuer_token_required" });
  const sep = token.indexOf(":");
  if (sep === -1) return res.status(401).json({ error: "invalid_token" });
  const id = token.slice(0, sep);
  const hash = token.slice(sep + 1);
  const issuer = getIssuer(id);
  if (!issuer || issuer.passwordHash !== hash || issuer.status !== "approved") {
    return res.status(401).json({ error: "unauthorized" });
  }
  req.issuer = issuer;
  next();
}
