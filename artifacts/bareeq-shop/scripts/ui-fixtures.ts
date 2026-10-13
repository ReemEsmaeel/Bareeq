import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { connectDB } from "../lib/db";
import { User } from "../models/User";
import { Order } from "../models/Order";
import { Product } from "../models/Product";

const temporaryEmail = /^ui-verification-[a-z0-9_-]+@example\.invalid$/;

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("UI fixtures are development-only.");
  const [action, ...args] = process.argv.slice(2);
  await connectDB();
  if (action === "prepare") {
    const email = args[0]?.toLowerCase();
    if (!email || !temporaryEmail.test(email)) throw new Error("Only the generated UI verification account is permitted.");
    const user = await User.findOneAndUpdate(
      { email, role: "customer" },
      { $set: { role: "admin" }, $inc: { authVersion: 1 } },
      { returnDocument: "after" },
    );
    if (!user) throw new Error("The temporary customer fixture was not found.");
    const customerEmail = `ui-verification-${randomUUID()}@example.invalid`;
    const customer = await User.create({
      name: "UI management verification",
      email: customerEmail,
      passwordHash: await bcrypt.hash(randomUUID(), 12),
      role: "customer",
    });
    console.log(JSON.stringify({ customerEmail, customerId: String(customer._id) }));
  } else if (action === "cleanup") {
    const emails = args.filter((value) => value.includes("@")).map((value) => value.toLowerCase());
    const productIds = args.filter((value) => /^[a-f\d]{24}$/i.test(value));
    if (!emails.length || emails.some((email) => !temporaryEmail.test(email))) throw new Error("Only temporary UI verification records may be removed.");
    const users = await User.find({ email: { $in: emails } }).select("_id").lean();
    await Order.deleteMany({ user: { $in: users.map((user: any) => user._id) } });
    await User.deleteMany({ email: { $in: emails } });
    await Product.deleteMany({ _id: { $in: productIds }, name: /^UI verification / });
    console.log("Temporary UI verification records removed.");
  } else {
    throw new Error("Choose prepare or cleanup.");
  }
}

main().catch(() => {
  console.error("UI fixture operation failed. Only development verification records are allowed.");
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
