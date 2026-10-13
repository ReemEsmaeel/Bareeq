import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import { User } from "../models/User";

const base = "http://localhost";
const emails = [0, 1].map(() => `verification-${randomUUID()}@example.invalid`);
const password = randomUUID() + "Aa1!";
const replacements = [0, 1].map(() => randomUUID() + "Bb2!");

async function request(path: string, method = "GET", body?: unknown, cookie?: string) {
  return fetch(`${base}/api/shop${path}`, {
    method,
    headers: { Origin: base, ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function cookieFrom(response: Response) {
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  return cookie;
}

try {
  await connectDB();
  const hash = await bcrypt.hash(password, 12);
  const [customer, admin] = await User.create([
    { name: "Session verification", email: emails[0], passwordHash: hash },
    { name: "Temporary verification admin", email: emails[1], passwordHash: hash, role: "admin" },
  ]);
  const login = await request("/auth/login", "POST", { email: emails[0], password });
  assert.equal(login.status, 200);
  const original = cookieFrom(login);
  const changes = await Promise.all(replacements.map((newPassword) =>
    request("/account", "PATCH", { name: "Session verification", currentPassword: password, newPassword }, original),
  ));
  const winner = changes.findIndex((response) => response.status === 200);
  assert.equal(changes.filter((response) => response.status === 200).length, 1, "Only one concurrent password update may succeed from the same session revision");
  assert.ok(changes.every((response) => response.status === 200 || [400, 401, 409].includes(response.status)));
  const current = cookieFrom(changes[winner]!);
  const saved = await User.findById(customer._id).select("+passwordHash");
  assert.equal(saved.authVersion, 1);
  assert.equal(await bcrypt.compare(replacements[winner]!, saved.passwordHash), true);
  assert.equal(await (await request("/auth/me", "GET", undefined, original)).json(), null);
  assert.equal((await (await request("/auth/me", "GET", undefined, current)).json()).id, String(customer._id));

  const adminLogin = await request("/auth/login", "POST", { email: emails[1], password });
  assert.equal(adminLogin.status, 200);
  const adminCookie = cookieFrom(adminLogin);
  assert.equal((await request(`/admin/customers/${customer._id}`, "PATCH", { name: "Session verification", active: false }, adminCookie)).status, 200);
  assert.equal(await (await request("/auth/me", "GET", undefined, current)).json(), null);
  assert.equal((await request(`/admin/customers/${customer._id}`, "PATCH", { name: "Session verification", active: true }, adminCookie)).status, 200);
  assert.equal((await User.findById(customer._id)).authVersion, 3);
  const freshLogin = await request("/auth/login", "POST", { email: emails[0], password: replacements[winner] });
  assert.equal(freshLogin.status, 200);
  const fresh = cookieFrom(freshLogin);
  assert.equal((await request(`/admin/customers/${customer._id}`, "PATCH", { name: "Name-only update", active: true }, adminCookie)).status, 200);
  assert.equal((await (await request("/auth/me", "GET", undefined, fresh)).json()).name, "Name-only update");
  assert.equal(admin.role, "admin");
  process.stdout.write("Session revocation verification passed: concurrent password updates cannot lose revisions, suspension invalidates sessions, and reactivation requires a fresh login.\n");
} finally {
  await connectDB();
  await User.deleteMany({ email: { $in: emails } });
  await mongoose.disconnect();
}
