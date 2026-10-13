import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { RateLimit } from "@/models/RateLimit";
import { connectDB } from "./db";
import { HttpError } from "./http";

export async function rateLimit(
  request: NextRequest,
  purpose: string,
  limit: number,
  minutes: number,
  email?: string,
) {
  await connectDB();
  const window = Math.floor(Date.now() / (minutes * 60000));
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const identities = email ? [ip, email] : [ip];
  for (const identity of identities) {
    const key = createHash("sha256").update(`${purpose}:${identity}:${window}`).digest("hex");
    const counter = await RateLimit.findOneAndUpdate(
      { _id: key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * minutes * 60000) } },
      { upsert: true, new: true },
    );
    if (counter.count > limit) throw new HttpError(429, "Too many attempts. Please wait a few minutes before trying again.");
  }
}
