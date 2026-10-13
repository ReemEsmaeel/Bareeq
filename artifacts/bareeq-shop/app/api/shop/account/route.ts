import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser, setSession } from "@/lib/auth";
import { checkOrigin, handle, HttpError } from "@/lib/http";
import { profileInput } from "@/lib/validation";
import { publicUser } from "@/lib/serialize";
import { User } from "@/models/User";

export async function PATCH(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    const sessionUser = await requireUser();
    const data = profileInput.parse(await request.json());
    const user = await User.findById(sessionUser._id).select("+passwordHash");
    if (!user || !user.active) throw new HttpError(401, "Please sign in again.");
    if (data.newPassword) {
      if (!data.currentPassword || !(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
        throw new HttpError(400, "Your current password is incorrect.");
      }
      user.passwordHash = await bcrypt.hash(data.newPassword, 12);
      user.authVersion += 1;
    }
    user.name = data.name;
    await user.save();
    await setSession(user);
    return publicUser(user);
  });
}
