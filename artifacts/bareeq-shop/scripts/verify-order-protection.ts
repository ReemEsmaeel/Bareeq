import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db";
import { User } from "../models/User";
import { Order } from "../models/Order";
import { Product } from "../models/Product";

const base = "http://localhost";
const emails = [0, 1].map(() => `order-protection-${randomUUID()}@example.invalid`);
const password = randomUUID() + "Aa1!";
let orderId: string | undefined;

async function request(path: string, cookie?: string, method = "GET", body?: unknown) {
  return fetch(`${base}${path}`, {
    method,
    redirect: "manual",
    headers: { Origin: base, ...(cookie ? { Cookie: cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function fixtureCustomer(email: string) {
  // Token-access regression tests must not consume the shared preview's
  // public signup/login quotas or weaken its live rate limits.
  const user = await User.create({
    name: "Order protection verification", email,
    passwordHash: await bcrypt.hash(password, 12), role: "customer",
  });
  const id = String(user._id);
  return { user: { id }, cookie: await signedCookie(id, "valid") };
}

async function denied(cookie?: string) {
  for (const path of ["/orders", `/orders/${orderId}`]) {
    const response = await request(path, cookie);
    assert.equal(response.status, 307, "Orders pages must redirect without a valid session.");
    const destination = new URL(response.headers.get("location")!, base);
    assert.equal(destination.pathname, "/login");
    assert.equal(destination.searchParams.get("next"), path);
  }
  for (const path of ["/api/shop/orders", `/api/shop/orders/${orderId}`]) {
    const response = await request(path, cookie);
    assert.equal(response.status, 401, "Orders APIs must reject invalid sessions.");
    assert.ok((await response.json()).error);
  }
  const place = await request("/api/shop/orders", cookie, "POST", { quote: "0".repeat(64) });
  assert.equal(place.status, 401, "An invalid session cannot place an order.");
}

async function signedCookie(userId: string, mode: "valid" | "expired" | "no-expiry" | "no-issued-at" | "no-revision") {
  // Runtime-only test signing; never print or return the key or token to logs.
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required for token verification.");
  const now = Math.floor(Date.now() / 1000);
  const jwt = new SignJWT(mode === "no-revision" ? {} : { version: 0 })
    .setProtectedHeader({ alg: "HS256" }).setSubject(userId)
    .setIssuer("bareeq-independent-shop").setAudience("shop");
  if (mode !== "no-issued-at") jwt.setIssuedAt(mode === "expired" ? now - 120 : now);
  if (mode !== "no-expiry") jwt.setExpirationTime(mode === "expired" ? now - 60 : now + 600);
  return `bareeq_shop_session=${await jwt.sign(new TextEncoder().encode(secret))}`;
}

try {
  if (process.env.NODE_ENV === "production") throw new Error("Order protection fixtures are development-only.");
  await connectDB();
  const first = await fixtureCustomer(emails[0]!);
  const other = await fixtureCustomer(emails[1]!);
  const product = await Product.findOne().lean();
  assert.ok(product, "Seed a sample product before verification.");
  const order = await Order.create({
    user: first.user.id,
    items: [{ product: product._id, name: product.name, nameAr: product.nameAr, quantity: 1, price: product.price }],
    total: product.price, status: "pending",
  });
  orderId = String(order._id);
  await denied();
  await denied("bareeq_shop_session=not-a-jwt");
  const [cookieName, raw] = first.cookie.split("=");
  const [header, payload, signature] = raw!.split(".");
  const tampered = `${cookieName}=${header}.${payload}.${signature![0] === "A" ? "B" : "A"}${signature!.slice(1)}`;
  await denied(tampered);
  for (const mode of ["expired", "no-expiry", "no-issued-at", "no-revision"] as const) {
    await denied(await signedCookie(first.user.id, mode));
  }
  assert.equal((await request("/orders", first.cookie)).status, 200);
  assert.equal((await request(`/orders/${orderId}`, first.cookie)).status, 200);
  const list = await (await request("/api/shop/orders", first.cookie)).json();
  assert.ok(list.some((item: any) => item.id === orderId));
  assert.equal((await request(`/api/shop/orders/${orderId}`, first.cookie)).status, 200);
  const otherList = await (await request("/api/shop/orders", other.cookie)).json();
  assert.ok(!otherList.some((item: any) => item.id === orderId));
  assert.equal((await request(`/api/shop/orders/${orderId}`, other.cookie)).status, 404, "Valid sessions cannot read another customer's order.");
  await User.updateOne({ _id: first.user.id }, { $inc: { authVersion: 1 } });
  await denied(first.cookie);
  await User.updateOne({ _id: other.user.id }, { $set: { active: false } });
  await denied(other.cookie);
  console.log("Order protection passed: page redirects, API 401s, malformed/tampered/expired/missing-claim/revoked/disabled sessions, valid access and customer-only ownership.");
} finally {
  await connectDB();
  if (orderId) await Order.deleteOne({ _id: orderId });
  await User.deleteMany({ email: { $in: emails } });
  await mongoose.disconnect();
}
