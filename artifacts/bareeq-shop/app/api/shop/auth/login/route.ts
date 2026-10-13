import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { User } from "@/models/User";
import { checkOrigin, handle, HttpError } from "@/lib/http";
import { loginInput } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { assertSessionConfig, setSession } from "@/lib/auth";
import { publicUser } from "@/lib/serialize";

export async function POST(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    assertSessionConfig();
    const data = loginInput.parse(await request.json());
    await rateLimit(request, "login", 12, 10, data.email);
    const user = await User.findOne({ email: data.email }).select("+passwordHash");
    const matches = user
      ? await bcrypt.compare(data.password, user.passwordHash)
      : (await bcrypt.hash(data.password, 12), false);
    if (!user || !matches || !user.active) {
      throw new HttpError(401, "The email or password is incorrect.");
    }
    await setSession(user);
    return publicUser(user);
  });
}
