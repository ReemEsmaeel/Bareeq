import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import { User } from "../models/User";

const base = "http://localhost";
const email = `verification-${randomUUID()}@example.invalid`;
const password = randomUUID() + "Aa1!";
const newPassword = randomUUID() + "Bb2!";

async function request(path: string, method = "GET", body?: unknown, cookie?: string) {
  return fetch(`${base}/api/shop${path}`, {
    method,
    headers: {
      Origin: base,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function cookieFrom(response: Response) {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "Session cookie must be set");
  assert.ok(setCookie.includes("HttpOnly"), "Session must be httpOnly");
  assert.ok(setCookie.includes("SameSite=lax"), "Session must be SameSite=lax");
  return setCookie.split(";")[0]!;
}

try {
  assert.equal((await request("/account", "PATCH", { name: "No session" })).status, 401);
  assert.equal((await request("/auth/signup", "POST", { name: "Invalid", email, password: "short" })).status, 400);
  assert.equal((await request("/auth/signup", "POST", { name: "Escalation", email, password, role: "admin" })).status, 400);

  const signup = await request("/auth/signup", "POST", { name: "Verification customer", email, password });
  assert.equal(signup.status, 201, `Signup failed: ${await signup.clone().text()}`);
  const originalCookie = cookieFrom(signup);
  const user = await signup.json();
  assert.equal(user.role, "customer");
  assert.equal(user.email, email);
  assert.equal(user.passwordHash, undefined);
  assert.equal(user.authVersion, undefined);

  const me = await request("/auth/me", "GET", undefined, originalCookie);
  assert.equal((await me.json()).id, user.id);
  assert.equal((await request("/auth/signup", "POST", { name: "Duplicate", email, password })).status, 409);
  assert.equal((await request("/auth/login", "POST", { email, password: "incorrect-password" })).status, 401);
  const login = await request("/auth/login", "POST", { email, password });
  assert.equal(login.status, 200);
  cookieFrom(login);

  const profile = await request("/account", "PATCH", { name: "Updated verification", currentPassword: password, newPassword }, originalCookie);
  assert.equal(profile.status, 200);
  const currentCookie = cookieFrom(profile);
  assert.equal((await profile.json()).name, "Updated verification");
  assert.equal(await (await request("/auth/me", "GET", undefined, originalCookie)).json(), null, "Old sessions must be invalid after a password change");
  assert.equal((await request("/auth/login", "POST", { email, password })).status, 401);
  assert.equal((await request("/auth/login", "POST", { email, password: newPassword })).status, 200);
  assert.equal((await request("/auth/logout", "POST", undefined, currentCookie)).status, 200);

  const csrf = await fetch(`${base}/api/shop/account`, {
    method: "PATCH",
    headers: { Origin: "https://other.example", Cookie: currentCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Not allowed" }),
  });
  assert.equal(csrf.status, 403);
  process.stdout.write("Auth verification passed: validation, signup/login, cookie flags, ownership, password change, logout, and CSRF protection.\n");
} finally {
  await connectDB();
  await User.deleteMany({ email });
  await mongoose.disconnect();
}
