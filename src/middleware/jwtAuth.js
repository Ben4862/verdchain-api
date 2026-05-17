import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "verdchain-dev-secret";

export function jwtAuth(req, res, next) {
  const auth  = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Token manquant" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

export function adminAuth(req, res, next) {
  jwtAuth(req, res, () => {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    next();
  });
}
