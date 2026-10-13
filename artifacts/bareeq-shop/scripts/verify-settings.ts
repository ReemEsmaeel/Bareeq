import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { assertActiveAdministratorCount } from "../lib/admin-settings";
import { HttpError } from "../lib/http";

const base = "http://localhost";
const token = randomUUID().slice(0, 8);
const password = randomUUID() + "Aa1!";
const emails = Array.from({ length: 7 }, (_, i) => `settings-verification-${token}-${i}@example.invalid`);
const roleIds: string[] = [];
const newPassword = randomUUID() + "Bb2!";

async function request(path: string, method = "GET", body?: unknown, cookie?: string) {
  return fetch(`${base}/api/shop${path}`, {
    method,
    headers: { Origin: base, ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function signup(email: string) {
  const response = await request("/auth/signup", "POST", { name: "Settings verification", email, password });
  assert.equal(response.status, 201);
  return { user: await response.json(), cookie: response.headers.get("set-cookie")!.split(";")[0]! };
}

async function login(email: string, value = password) {
  const response = await request("/auth/login", "POST", { email, password: value });
  assert.equal(response.status, 200);
  const user = await response.json();
  assert.equal("passwordHash" in user, false);
  return { user, cookie: response.headers.get("set-cookie")!.split(";")[0]! };
}

async function newRole(cookie: string, suffix: string, permissions: string[]) {
  const response = await request("/admin/settings/roles", "POST",
    { name: `Verification ${token} ${suffix}`, nameAr: "دور مؤقت للتحقق", permissions }, cookie);
  assert.equal(response.status, 201, "Custom role creation should succeed.");
  const role = await response.json();
  roleIds.push(role.id);
  return role;
}

async function newAccount(cookie: string, email: string, roleId: string) {
  const response = await request("/admin/settings/users", "POST",
    { name: "Temporary staff", email, password, roleId, active: true }, cookie);
  assert.equal(response.status, 201, "Admin account creation should succeed.");
  const user = await response.json();
  assert.equal("passwordHash" in user, false);
  assert.equal("password" in user, false);
  return user;
}

function accountEdit(user: any, extra: Record<string, unknown> = {}) {
  return { name: user.name, email: user.email, roleId: user.roleId, active: true, ...extra };
}

try {
  await connectDB();
  await Role.init();
  assert.throws(() => assertActiveAdministratorCount(0), (error) => error instanceof HttpError && error.status === 409);
  assert.doesNotThrow(() => assertActiveAdministratorCount(1));
  const admin = await signup(emails[0]!);
  const adminB = await signup(emails[1]!);
  const customer = await signup(emails[2]!);
  await User.updateMany({ _id: { $in: [admin.user.id, adminB.user.id] } }, { $set: { role: "admin" } });
  assert.equal((await request("/admin/settings/users")).status, 401);
  assert.equal((await request("/admin/settings/roles", "GET", undefined, customer.cookie)).status, 403);
  assert.equal((await request("/auth/signup", "POST",
    { name: "Injection attempt", email: emails[6], password, role: "staff", roleId: "admin" })).status, 400);
  for (const permission of [[], ["payments"], ["products", "products"]]) {
    assert.equal((await request("/admin/settings/roles", "POST",
      { name: `Invalid ${token}`, nameAr: "غير صالح", permissions: permission }, admin.cookie)).status, 400);
  }
  for (const builtin of ["admin", "customer"]) {
    assert.equal((await request(`/admin/settings/roles/${builtin}`, "DELETE", undefined, admin.cookie)).status, 403);
    assert.equal((await request(`/admin/settings/roles/${builtin}`, "PUT",
      { name: "Cannot replace built-in", nameAr: "محمي", permissions: ["settings"] }, admin.cookie)).status, 403);
  }
  const catalog = await newRole(admin.cookie, "catalog", ["products", "photos"]);
  const staff = await newAccount(admin.cookie, emails[3]!, catalog.id);
  let staffLogin = await login(staff.email);
  assert.equal(staffLogin.user.role, "staff");
  assert.deepEqual(staffLogin.user.permissions, ["products", "photos"]);
  assert.equal((await request("/admin/products", "GET", undefined, staffLogin.cookie)).status, 200);
  assert.equal((await request("/admin/photos", "GET", undefined, staffLogin.cookie)).status, 200);
  for (const path of ["/admin/orders", "/admin/customers", "/admin/settings/users", "/admin/settings/roles"]) {
    assert.equal((await request(path, "GET", undefined, staffLogin.cookie)).status, 403);
  }
  const summary = await (await request("/admin/summary", "GET", undefined, staffLogin.cookie)).json();
  assert.equal(typeof summary.products, "number");
  assert.equal(summary.orders, null);
  assert.equal(summary.customers, null);
  assert.equal(summary.orderValue, null);
  assert.deepEqual(summary.latestOrders, []);
  assert.equal((await request(`/admin/settings/roles/${catalog.id}`, "DELETE", undefined, admin.cookie)).status, 409);

  const settings = await newRole(admin.cookie, "access-only", ["settings"]);
  const limited = await newAccount(admin.cookie, emails[4]!, settings.id);
  const limitedLogin = await login(limited.email);
  assert.equal((await request("/admin/settings/users", "GET", undefined, limitedLogin.cookie)).status, 200);
  assert.equal((await request("/admin/settings/users", "POST",
    { name: "Cannot escalate", email: emails[6], password, roleId: "admin", active: true }, limitedLogin.cookie)).status, 403);
  assert.equal((await request("/admin/settings/users", "POST",
    { name: "Cannot assign", email: emails[6], password, roleId: catalog.id, active: true }, limitedLogin.cookie)).status, 403);
  assert.equal((await request("/admin/settings/roles", "POST",
    { name: `Escalation ${token}`, nameAr: "مرفوض", permissions: ["settings", "orders"] }, limitedLogin.cookie)).status, 403);
  assert.equal((await request(`/admin/settings/users/${admin.user.id}`, "PATCH",
    accountEdit({ ...admin.user, roleId: "admin" }, { name: "Unauthorized edit" }), limitedLogin.cookie)).status, 403);
  assert.equal((await request(`/admin/settings/roles/${catalog.id}`, "PUT",
    { name: catalog.name, nameAr: catalog.nameAr, permissions: ["settings"] }, limitedLogin.cookie)).status, 403);

  const oldVersion = (await User.findById(staff.id)).authVersion;
  const roleUpdate = await request(`/admin/settings/roles/${catalog.id}`, "PUT",
    { name: catalog.name, nameAr: catalog.nameAr, permissions: ["products"] }, admin.cookie);
  assert.equal(roleUpdate.status, 200);
  assert.equal((await User.findById(staff.id)).authVersion, oldVersion + 1);
  assert.equal((await request("/admin/products", "GET", undefined, staffLogin.cookie)).status, 401);
  staffLogin = await login(staff.email);
  assert.deepEqual(staffLogin.user.permissions, ["products"]);
  assert.equal((await request("/admin/photos", "GET", undefined, staffLogin.cookie)).status, 403);

  const orders = await newRole(admin.cookie, "orders", ["orders"]);
  assert.equal((await request(`/admin/settings/users/${staff.id}`, "PATCH",
    accountEdit(staff, { roleId: orders.id, name: "Updated staff" }), admin.cookie)).status, 200);
  assert.equal((await request("/admin/products", "GET", undefined, staffLogin.cookie)).status, 401);
  staffLogin = await login(staff.email);
  assert.deepEqual(staffLogin.user.permissions, ["orders"]);
  assert.equal((await request("/admin/orders", "GET", undefined, staffLogin.cookie)).status, 200);
  assert.equal((await request("/admin/products", "GET", undefined, staffLogin.cookie)).status, 403);
  assert.equal((await request(`/admin/settings/users/${staff.id}`, "PATCH",
    accountEdit(staffLogin.user, { newPassword }), admin.cookie)).status, 200);
  assert.equal((await request("/admin/orders", "GET", undefined, staffLogin.cookie)).status, 401);
  assert.equal((await request("/auth/login", "POST", { email: staff.email, password })).status, 401);
  staffLogin = await login(staff.email, newPassword);

  assert.equal((await request(`/admin/settings/users/${admin.user.id.toUpperCase()}`, "DELETE", undefined, admin.cookie)).status, 409);
  assert.equal((await request(`/admin/settings/users/${admin.user.id}`, "PATCH",
    accountEdit({ ...admin.user, roleId: "admin" }, { active: false }), admin.cookie)).status, 409);
  assert.equal((await request(`/admin/settings/users/${admin.user.id}`, "PATCH",
    accountEdit({ ...admin.user, roleId: "admin" }, { roleId: "customer" }), admin.cookie)).status, 409);
  const csrf = await fetch(`${base}/api/shop/admin/settings/users/${staff.id}`, {
    method: "DELETE", headers: { Origin: "https://other.example", Cookie: admin.cookie },
  });
  assert.equal(csrf.status, 403);

  // Deletion and assignment must not leave a dangling custom-role reference.
  const raceRole = await newRole(admin.cookie, "race", ["products"]);
  const [roleDelete, assigned] = await Promise.all([
    request(`/admin/settings/roles/${raceRole.id}`, "DELETE", undefined, admin.cookie),
    request("/admin/settings/users", "POST",
      { name: "Race staff", email: emails[5], password, roleId: raceRole.id, active: true }, admin.cookie),
  ]);
  assert.ok((roleDelete.status === 200 && [404, 409].includes(assigned.status)) ||
    (roleDelete.status === 409 && assigned.status === 201));
  const raceUser = await User.findOne({ email: emails[5] });
  if (raceUser) assert.ok(await Role.exists({ _id: raceUser.roleId }));

  assert.equal((await request(`/admin/settings/users/${staff.id}`, "DELETE", undefined, admin.cookie)).status, 200);
  assert.equal((await request("/admin/orders", "GET", undefined, staffLogin.cookie)).status, 401);
  assert.equal((await request(`/admin/settings/roles/${orders.id}`, "DELETE", undefined, admin.cookie)).status, 200);
  assert.equal((await request(`/admin/settings/roles/${catalog.id}`, "DELETE", undefined, admin.cookie)).status, 200);

  // Both fixture admins start authorized. Only one may disable the other:
  // the second transaction must re-check its now-revoked actor, not a stale JWT.
  const results = await Promise.all([
    request(`/admin/settings/users/${adminB.user.id}`, "PATCH",
      accountEdit({ ...adminB.user, roleId: "admin" }, { active: false }), admin.cookie),
    request(`/admin/settings/users/${admin.user.id}`, "PATCH",
      accountEdit({ ...admin.user, roleId: "admin" }, { active: false }), adminB.cookie),
  ]);
  assert.equal(results.filter((response) => response.status === 200).length, 1);
  assert.equal(results.filter((response) => response.status === 401).length, 1);
  console.log("Settings verification passed: account/role CRUD, server permission isolation, redacted overview, built-in/self/last-admin guards, grant ceilings, session revocation, password reset, CSRF and concurrent authorization/role assignment safety.");
} finally {
  await connectDB();
  await User.deleteMany({ email: { $in: emails } });
  await Role.deleteMany({ _id: { $in: roleIds } });
  await mongoose.disconnect();
}
