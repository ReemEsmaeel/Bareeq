import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db";
import { emailInput, passwordInput } from "../lib/validation";
import { User } from "../models/User";
import { Bootstrap } from "../models/Bootstrap";

async function main() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error("Add ADMIN_EMAIL and ADMIN_PASSWORD in Replit Secrets before running private admin setup.");
  }
  const email = emailInput.parse(process.env.ADMIN_EMAIL);
  const password = passwordInput.parse(process.env.ADMIN_PASSWORD);
  await connectDB();
  await Promise.all([User.init(), Bootstrap.init()]);
  const already = await User.findOne({ role: "admin" });
  if (already) {
    if (already.email === email) {
      console.log("The configured administrator already exists. No account or password was changed.");
      return;
    }
    throw new Error("An administrator is already configured. First-admin setup cannot add another administrator.");
  }
  const hash = await bcrypt.hash(password, 12);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (await User.exists({ role: "admin" }).session(session)) {
        throw new Error("An administrator is already configured.");
      }
      await Bootstrap.create([{ _id: "first-admin", completedAt: new Date() }], { session });
      const existing = await User.findOne({ email }).select("+passwordHash").session(session);
      if (existing) {
        if (!(await bcrypt.compare(password, existing.passwordHash))) {
          throw new Error("This email belongs to a customer. Use its current password for private setup, or configure a different email.");
        }
        const promoted = await User.updateOne(
          { _id: existing._id, role: "customer", authVersion: existing.authVersion },
          { $set: { role: "admin", active: true }, $inc: { authVersion: 1 } },
          { session, runValidators: true },
        );
        if (!promoted.matchedCount) throw new Error("This email's account changed during setup. Retry private admin setup.");
      } else {
        await User.create([{
          name: "Atelier Administrator",
          email,
          passwordHash: hash,
          role: "admin",
          active: true,
        }], { session });
      }
    });
    console.log("First administrator configured securely. Sign in through the shop's normal login page.");
  } finally {
    await session.endSession();
  }
}

main().catch((error) => {
  const safe = error instanceof Error && [
    "Add ADMIN_EMAIL", "An administrator", "This email",
  ].some((prefix) => error.message.startsWith(prefix));
  console.error(safe ? error.message : "Admin setup failed. Check the bootstrap credentials and database connection. Passwords need at least 8 characters and at most 72 bytes.");
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
