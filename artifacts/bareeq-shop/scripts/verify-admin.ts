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
  const response = await request("/auth/signup", "POST", { name: "Admin verification", email, password });
  assert.equal(response.status, 201);
  return {
    user: await response.json(),
    cookie: response.headers.get("set-cookie")!.split(";")[0]!,
  };
}

try {
  await connectDB();
  assert.equal((await request("/admin/products")).status, 401);
  const admin = await customer(emails[0]!);
  const shopper = await customer(emails[1]!);
  assert.equal((await request("/admin/products", "GET", undefined, shopper.cookie)).status, 403);
  // Trusted, temporary test fixture only; there is no public role-changing API.
  await User.updateOne({ _id: admin.user.id }, { $set: { role: "admin" } });
  const input = {
    name: "Temporary admin verification piece",
    nameAr: "قطعة مؤقتة للتحقق",
    description: "Temporary record removed after verification.",
    descriptionAr: "سجل مؤقت يُحذف بعد التحقق.",
    price: 12.34,
    image: "/bareeq-editorial.jpg",
    category: "Lujain",
  };
  assert.equal((await request("/admin/products", "POST", input, shopper.cookie)).status, 403);
  assert.equal((await request("/admin/products", "POST", { ...input, price: -1 }, admin.cookie)).status, 400);
  const created = await request("/admin/products", "POST", input, admin.cookie);
  assert.equal(created.status, 201, `Admin product creation failed: ${await created.clone().text()}`);
  productId = (await created.json()).id;
  const update = await request(`/admin/products/${productId}`, "PUT", { ...input, price: 34.56 }, admin.cookie);
  assert.equal(update.status, 200);
  assert.equal((await (await request(`/products/${productId}`)).json()).price, 34.56);
  const cart = await (await request("/cart", "POST", { productId, quantity: 1 }, shopper.cookie)).json();
  const placed = await request("/orders", "POST", { quote: cart.quote }, shopper.cookie);
  assert.equal(placed.status, 201);
  const order = await placed.json();
  assert.equal((await request(`/admin/orders/${order.id}`, "PATCH", { status: "paid", total: 0 }, admin.cookie)).status, 400);
  const status = await request(`/admin/orders/${order.id}`, "PATCH", { status: "paid" }, admin.cookie);
  assert.equal(status.status, 200, `Order status update failed: ${await status.clone().text()}`);
  assert.equal((await status.json()).status, "paid");
  const adminOrders = await (await request("/admin/orders", "GET", undefined, admin.cookie)).json();
  const recorded = adminOrders.find((item: any) => item.id === order.id);
  assert.equal(recorded.customer.email, emails[1]);
  assert.equal(JSON.stringify(adminOrders).includes("passwordHash"), false);

  const customers = await (await request("/admin/customers", "GET", undefined, admin.cookie)).json();
  assert.ok(customers.every((user: any) => user.role === "customer" && !("passwordHash" in user) && !("authVersion" in user) && !("cart" in user)));
  assert.equal((await request(`/admin/customers/${shopper.user.id}`, "PATCH", { name: "Not allowed", active: true, role: "admin" }, admin.cookie)).status, 400);
  assert.equal((await request(`/admin/customers/${admin.user.id}`, "PATCH", { name: "Self", active: false }, admin.cookie)).status, 404);
  const deactivated = await request(`/admin/customers/${shopper.user.id}`, "PATCH", { name: "Updated customer", active: false }, admin.cookie);
  assert.equal(deactivated.status, 200);
  assert.equal((await request("/cart", "GET", undefined, shopper.cookie)).status, 401);
  assert.equal((await request("/auth/login", "POST", { email: emails[1], password })).status, 401);
  assert.equal((await request(`/admin/customers/${shopper.user.id}`, "PATCH", { name: "Updated customer", active: true }, admin.cookie)).status, 200);
  assert.equal((await request("/cart", "GET", undefined, shopper.cookie)).status, 401, "Reactivation must not restore old sessions");
  const login = await request("/auth/login", "POST", { email: emails[1], password });
  assert.equal(login.status, 200);
  const current = login.headers.get("set-cookie")!.split(";")[0]!;

  await request("/cart", "POST", { productId, quantity: 1 }, current);
  assert.equal((await request(`/admin/products/${productId}`, "DELETE", undefined, admin.cookie)).status, 200);
  assert.equal((await request(`/products/${productId}`)).status, 404);
  const changedCart = await (await request("/cart", "GET", undefined, current)).json();
  assert.equal(changedCart.removedItems, true);
  assert.equal(changedCart.items.length, 0);
  const historic = await (await request(`/orders/${order.id}`, "GET", undefined, current)).json();
  assert.equal(historic.items[0].price, 34.56);
  assert.equal(historic.items[0].name, input.name);
  assert.equal(historic.status, "paid");
  const summary = await request("/admin/summary", "GET", undefined, admin.cookie);
  assert.equal(summary.status, 200);
  assert.ok((await summary.json()).orders >= 1);
  await User.updateOne({ _id: admin.user.id }, { $set: { role: "customer" } });
  assert.equal((await request("/admin/products", "GET", undefined, admin.cookie)).status, 403, "Current database role must override any cached client/session role");
  process.stdout.write("Admin verification passed: server roles, product CRUD, historical order preservation, manual order statuses, safe customer listing/editing, account suspension/reactivation, and session revocation.\n");
} finally {
  await connectDB();
  const users = await User.find({ email: { $in: emails } }).select("_id").lean();
  await Order.deleteMany({ user: { $in: users.map((user: any) => user._id) } });
  await User.deleteMany({ email: { $in: emails } });
  if (productId) await Product.deleteOne({ _id: productId });
  await mongoose.disconnect();
}
