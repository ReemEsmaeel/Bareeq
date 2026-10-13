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
    if (user.authVersion !== sessionUser.authVersion) {
      throw new HttpError(409, "Your account changed. Please sign in again before saving.");
    }
    if (data.newPassword) {
      if (!data.currentPassword || !(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
        throw new HttpError(400, "Your current password is incorrect.");
      }
    }
    const update = data.newPassword
      ? { $set: { name: data.name, passwordHash: await bcrypt.hash(data.newPassword, 12) }, $inc: { authVersion: 1 } }
      : { $set: { name: data.name } };
    const updated = await User.findOneAndUpdate(
      { _id: user._id, active: true, authVersion: sessionUser.authVersion },
      update,
      { returnDocument: "after", runValidators: true },
    );
    if (!updated) throw new HttpError(409, "Your account changed. Refresh or sign in again before saving.");
    await setSession(updated);
    return publicUser(updated);
  });
}
