import crypto from "crypto";

const universities = new Map();

const demoId = "uni_oxford";
universities.set(demoId, {
  id: demoId,
  name: "Oxford University",
  email: "registrar@oxford.edu",
  passwordHash: crypto.createHash("sha256").update("oxford123").digest("hex"),
  status: "approved",
  createdAt: new Date().toISOString(),
});

const pendingId = "uni_cambridge";
universities.set(pendingId, {
  id: pendingId,
  name: "Cambridge University",
  email: "admin@cambridge.edu",
  passwordHash: crypto.createHash("sha256").update("cambridge123").digest("hex"),
  status: "pending",
  createdAt: new Date().toISOString(),
});

export function registerUniversity({ name, email, password }) {
  for (const uni of universities.values()) {
    if (uni.email === email) throw Object.assign(new Error("email_taken"), { status: 409 });
  }
  const id = "uni_" + crypto.randomBytes(8).toString("hex");
  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  const university = { id, name, email, passwordHash, status: "pending", createdAt: new Date().toISOString() };
  universities.set(id, university);
  return university;
}

export function loginUniversity({ email, password }) {
  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  for (const uni of universities.values()) {
    if (uni.email === email && uni.passwordHash === passwordHash) return uni;
  }
  return null;
}

export function getPendingUniversities() {
  return [...universities.values()].filter(u => u.status === "pending");
}

export function getUniversity(id) {
  return universities.get(id);
}

export function approveUniversity(id) {
  const uni = universities.get(id);
  if (!uni) return null;
  uni.status = "approved";
  return uni;
}

export function rejectUniversity(id) {
  const uni = universities.get(id);
  if (!uni) return null;
  universities.delete(id);
  return uni;
}
