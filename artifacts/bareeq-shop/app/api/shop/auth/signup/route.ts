import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { User } from "@/models/User";
import { checkOrigin, handle, HttpError } from "@/lib/http";
import { signupInput } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { assertSessionConfig, setSession } from "@/lib/auth";
import { publicUser } from "@/lib/serialize";

export async function POST(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    assertSessionConfig();
    const data = signupInput.parse(await request.json());
    await rateLimit(request, "signup", 10, 60);
    const passwordHash = await bcrypt.hash(data.password, 12);
    let user;
    try {
      user = await User.create({ name: data.name, email: data.email, passwordHash, role: "customer" });
    } catch (error: any) {
      if (error?.code === 11000) throw new HttpError(409, "An account with this email already exists. Please sign in.");
      throw error;
    }
    await setSession(user);
    return publicUser(user);
  }, 201);
}
