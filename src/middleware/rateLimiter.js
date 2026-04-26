const WINDOW_MS   = 60_000;
const MAX_ANCHOR  = 30;
const MAX_VERIFY  = 120;
const MAX_DEFAULT = 60;
const store       = new Map();

function getLimit(path) {
  if (path.startsWith("/api/anchor")) return MAX_ANCHOR;
  if (path.startsWith("/api/verify")) return MAX_VERIFY;
  return MAX_DEFAULT;
}

export function rateLimiter(req, res, next) {
  const ip    = req.ip || "unknown";
  const key   = `${ip}:${req.path}`;
  const limit = getLimit(req.path);
  const now   = Date.now();

  let record = store.get(key);
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + WINDOW_MS };
  }

  record.count++;
  store.set(key, record);

  if (record.count > limit) {
    return res.status(429).json({ error: "too_many_requests" });
  }

  next();
}
