import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { Order } from "../models/Order";

const base = "http://localhost";
const emails = [0, 1].map(() => `verification-${randomUUID()}@example.invalid`);
const password = randomUUID() + "Aa1!";
let productId: string | undefined;

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

async function customer(email: string) {
  const response = await request("/auth/signup", "POST", { name: "Shop verification", email, password });
  assert.equal(response.status, 201);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  return cookie;
}

try {
  await connectDB();
  const product = await Product.create({
    name: "Temporary verification piece",
    nameAr: "قطعة للتحقق المؤقت",
    description: "Temporary record removed after verification.",
    descriptionAr: "سجل مؤقت يُحذف بعد التحقق.",
    price: 123.45,
    image: "/bareeq-editorial.jpg",
    category: "Lujain",
  });
  productId = String(product._id);
  assert.equal((await request("/cart")).status, 401);
  assert.equal((await request("/orders")).status, 401);
  const a = await customer(emails[0]!);
  const b = await customer(emails[1]!);
  assert.equal((await request("/cart", "POST", { productId, quantity: 0 }, a)).status, 400);
  const added = await request("/cart", "POST", { productId, quantity: 2 }, a);
  assert.equal(added.status, 200, `Cart add failed: ${await added.clone().text()}`);
  assert.equal((await added.json()).total, 246.9);
  assert.deepEqual((await (await request("/cart", "GET", undefined, b)).json()).items, []);
  const updated = await request("/cart", "PATCH", { productId, quantity: 3 }, a);
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).total, 370.35);

  await request("/auth/logout", "POST", undefined, a);
  const login = await request("/auth/login", "POST", { email: emails[0], password });
  assert.equal(login.status, 200);
  const current = login.headers.get("set-cookie")!.split(";")[0]!;
  const cart = await (await request("/cart", "GET", undefined, current)).json();
  assert.equal(cart.items[0].quantity, 3, "Cart must survive logout/login");
  assert.equal((await request("/orders", "POST", { quote: "0".repeat(64) }, current)).status, 409);
  const placed = await request("/orders", "POST", { quote: cart.quote }, current);
  assert.equal(placed.status, 201, `Order placement failed: ${await placed.clone().text()}`);
  const order = await placed.json();
  assert.equal(order.total, 370.35);
  assert.equal(order.status, "pending");
  assert.equal(order.items[0].price, 123.45);
  assert.deepEqual((await (await request("/cart", "GET", undefined, current)).json()).items, []);
  assert.equal((await request(`/orders/${order.id}`, "GET", undefined, b)).status, 404);
  assert.deepEqual(await (await request("/orders", "GET", undefined, b)).json(), []);
  assert.equal((await request("/orders", "POST", { quote: cart.quote }, current)).status, 400);
  assert.equal((await (await request("/orders", "GET", undefined, current)).json()).length, 1);

  const again = await (await request("/cart", "POST", { productId, quantity: 1 }, current)).json();
  const concurrent = await Promise.all([
    request("/orders", "POST", { quote: again.quote }, current),
    request("/orders", "POST", { quote: again.quote }, current),
  ]);
  assert.equal(concurrent.filter((response) => response.status === 201).length, 1, "Concurrent placement must not duplicate an order");
  assert.equal((await (await request("/orders", "GET", undefined, current)).json()).length, 2);
  await request("/cart", "POST", { productId, quantity: 1 }, current);
  assert.equal((await request("/cart", "PATCH", { productId, quantity: 0 }, current)).status, 200);
  assert.deepEqual((await (await request("/cart", "GET", undefined, current)).json()).items, []);
  assert.equal((await request("/cart", "DELETE", undefined, current)).status, 200);
  process.stdout.write("Shop verification passed: persistent user-isolated carts, quantities/removal, server prices, stale-quote rejection, atomic order placement, duplicate prevention, and private order access.\n");
} finally {
  await connectDB();
  const users = await User.find({ email: { $in: emails } }).select("_id").lean();
  await Order.deleteMany({ user: { $in: users.map((user: any) => user._id) } });
  await User.deleteMany({ email: { $in: emails } });
  if (productId) await Product.deleteOne({ _id: productId });
  await mongoose.disconnect();
}
