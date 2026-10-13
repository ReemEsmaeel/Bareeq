import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { User } from "@/models/User";
import { connectDB } from "./db";
import { HttpError } from "./http";

const COOKIE = "bareeq_shop_session";
const ISSUER = "bareeq-independent-shop";

function sessionKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new HttpError(500, "JWT_SECRET must be configured with at least 32 random characters in Replit Secrets.");
  }
  return new TextEncoder().encode(secret);
}

export function assertSessionConfig() {
  sessionKey();
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let payload;
  try {
    payload = (await jwtVerify(token, sessionKey(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: "shop",
    })).payload;
  } catch {
    return null;
  }
  if (typeof payload.sub !== "string" || !/^[a-f\d]{24}$/i.test(payload.sub)) return null;
  await connectDB();
  const user = await User.findById(payload.sub);
  if (!user || !user.active || user.authVersion !== payload.version) return null;
  return user;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  // Always use the current database role, never a client field or JWT role.
  if (user.role !== "admin") throw new HttpError(403, "Administrator access is required.");
  return user;
}

export async function requirePageUser(nextPath: string) {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requireAdminPage() {
  const user = await requirePageUser("/admin");
  if (user.role !== "admin") redirect("/account");
  return user;
}

export async function setSession(user: any) {
  const token = await new SignJWT({ version: user.authVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user._id))
    .setIssuer(ISSUER)
    .setAudience("shop")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(sessionKey());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function clearSession() {
  (await cookies()).set(COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
