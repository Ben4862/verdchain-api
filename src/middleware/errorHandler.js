export function errorHandler(err, req, res, _next) {
  console.error(`[error] ${req.method} ${req.path}:`, err.message);

  if (err.code === "CALL_EXCEPTION")
    return res.status(400).json({ error: "contract_error", message: err.reason || err.message });

  if (err.code === "INSUFFICIENT_FUNDS")
    return res.status(503).json({ error: "insufficient_funds", message: "Operator wallet needs POL for gas." });

  if (err.code === "NETWORK_ERROR")
    return res.status(503).json({ error: "network_error", message: "Blockchain RPC unavailable." });

  return res.status(500).json({
    error:   "internal_error",
    message: process.env.NODE_ENV === "production" ? "An unexpected error occurred." : err.message,
  });
}
