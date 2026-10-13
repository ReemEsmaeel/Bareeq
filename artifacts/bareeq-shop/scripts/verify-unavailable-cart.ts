import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db";
import { readCart, mutateCart } from "../lib/cart";
import { User } from "../models/User";
import { Product } from "../models/Product";

const email = `verification-${randomUUID()}@example.invalid`;
const productIds: string[] = [];

try {
  await connectDB();
  const user = await User.create({
    name: "Unavailable bag verification",
    email,
    passwordHash: await bcrypt.hash(randomUUID(), 12),
    cart: Array.from({ length: 40 }, () => ({ product: new mongoose.Types.ObjectId(), quantity: 1 })),
  });
  const before = await readCart(user);
  assert.equal(before.items.length, 0);
  assert.equal(before.removedItems, true);
  for (const price of [13.37, 2]) {
    const product = await Product.create({
      name: `Temporary bag verification ${randomUUID()}`,
      nameAr: "قطعة مؤقتة للتحقق",
      description: "Temporary verification record.",
      descriptionAr: "سجل مؤقت للتحقق.",
      price,
      image: "/bareeq-editorial.jpg",
      category: "Lujain",
    });
    productIds.push(String(product._id));
  }
  const first = await mutateCart(String(user._id), productIds[0]!, 1, "add");
  assert.equal(first.total, 13.37);
  assert.equal((await User.findById(user._id)).cart.length, 1, "Unavailable references must not fill the bag limit");
  await mutateCart(String(user._id), productIds[1]!, 1, "add");
  const changed = await mutateCart(String(user._id), productIds[0]!, 3, "set");
  assert.equal(changed.items[0]?.product.id, productIds[0], "Quantity edits must preserve item ordering");
  assert.equal(changed.total, 42.11);
  await Product.deleteOne({ _id: productIds[1] });
  const cleaned = await mutateCart(String(user._id), productIds[0]!, 4, "set");
  assert.equal(cleaned.items.length, 1);
  assert.equal(cleaned.total, 53.48);
  assert.equal((await User.findById(user._id)).cart.length, 1);
  console.log("Unavailable-cart verification passed: missing pieces cannot fill the bag limit, mutations prune stale references, and quantity edits preserve order.");
} finally {
  await connectDB();
  await User.deleteMany({ email });
  await Product.deleteMany({ _id: { $in: productIds } });
  await mongoose.disconnect();
}
