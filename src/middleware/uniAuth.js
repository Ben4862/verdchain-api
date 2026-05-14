import { getUniversity } from "../services/registry.js";

export function uniAuth(req, res, next) {
  const token = req.headers["x-university-token"];
  if (!token) return res.status(401).json({ error: "university_token_required" });
  const sep = token.indexOf(":");
  if (sep === -1) return res.status(401).json({ error: "invalid_token" });
  const id = token.slice(0, sep);
  const hash = token.slice(sep + 1);
  const uni = getUniversity(id);
  if (!uni || uni.passwordHash !== hash || uni.status !== "approved") {
    return res.status(401).json({ error: "unauthorized" });
  }
  req.university = uni;
  next();
}
