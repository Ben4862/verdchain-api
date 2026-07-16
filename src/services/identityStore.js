const identitiesByIssuer = new Map();
const revokedHashes      = new Map();
const auditLogByIssuer   = new Map();

export function recordIdentity(issuerId, identity) {
  if (!identitiesByIssuer.has(issuerId)) identitiesByIssuer.set(issuerId, []);
  identitiesByIssuer.get(issuerId).unshift(identity);
  addAuditEntry(issuerId, "anchor", { hash: identity.hash, agent: identity.agent_name });
}

export function getIdentities(issuerId) {
  return (identitiesByIssuer.get(issuerId) || []).map(a => ({
    ...a,
    status:    revokedHashes.has(a.hash) ? "revoked" : "anchored",
    revokedAt: revokedHashes.get(a.hash)?.revokedAt,
  }));
}

export function getIdentityByHash(hash) {
  for (const identities of identitiesByIssuer.values()) {
    const a = identities.find(x => x.hash === hash);
    if (a) return a;
  }
  return null;
}

export function revokeIdentity(hash, issuerId, reason = "") {
  if (revokedHashes.has(hash)) throw Object.assign(new Error("already_revoked"), { status: 409 });
  revokedHashes.set(hash, { revokedAt: new Date().toISOString(), revokedBy: issuerId, reason });
  addAuditEntry(issuerId, "revoke", { hash, reason });
}

export function isRevoked(hash)    { return revokedHashes.has(hash); }
export function getRevokeInfo(hash){ return revokedHashes.get(hash); }

export function addAuditEntry(issuerId, action, details = {}) {
  if (!auditLogByIssuer.has(issuerId)) auditLogByIssuer.set(issuerId, []);
  auditLogByIssuer.get(issuerId).unshift({ timestamp: new Date().toISOString(), action, details });
}

export function getAuditLog(issuerId) { return auditLogByIssuer.get(issuerId) || []; }
