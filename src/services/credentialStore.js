const credentialsByIssuer = new Map();
const revokedHashes      = new Map();
const auditLogByIssuer   = new Map();

export function recordCredential(uniId, credential) {
  if (!credentialsByIssuer.has(uniId)) credentialsByIssuer.set(uniId, []);
  credentialsByIssuer.get(uniId).unshift(credential);
  addAuditEntry(uniId, "anchor", { hash: credential.hash, candidate: credential.candidate_name });
}

export function getCredentials(uniId) {
  return (credentialsByIssuer.get(uniId) || []).map(c => ({
    ...c,
    status:    revokedHashes.has(c.hash) ? "revoked" : "anchored",
    revokedAt: revokedHashes.get(c.hash)?.revokedAt,
  }));
}

export function getCredentialByHash(hash) {
  for (const creds of credentialsByIssuer.values()) {
    const c = creds.find(x => x.hash === hash);
    if (c) return c;
  }
  return null;
}

export function revokeCredential(hash, uniId, reason = "") {
  if (revokedHashes.has(hash)) throw Object.assign(new Error("already_revoked"), { status: 409 });
  revokedHashes.set(hash, { revokedAt: new Date().toISOString(), revokedBy: uniId, reason });
  addAuditEntry(uniId, "revoke", { hash, reason });
}

export function isRevoked(hash)    { return revokedHashes.has(hash); }
export function getRevokeInfo(hash){ return revokedHashes.get(hash); }

export function addAuditEntry(uniId, action, details = {}) {
  if (!auditLogByIssuer.has(uniId)) auditLogByIssuer.set(uniId, []);
  auditLogByIssuer.get(uniId).unshift({ timestamp: new Date().toISOString(), action, details });
}

export function getAuditLog(uniId) { return auditLogByIssuer.get(uniId) || []; }
