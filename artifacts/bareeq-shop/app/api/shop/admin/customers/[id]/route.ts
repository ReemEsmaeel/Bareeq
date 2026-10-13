import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, handle, HttpError, validId } from "@/lib/http";
import { nameInput } from "@/lib/validation";
import { publicUser } from "@/lib/serialize";
import { User } from "@/models/User";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    checkOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    validId(id);
    const data = z.object({ name: nameInput, active: z.boolean() }).strict().parse(await request.json());
    const user = await User.findOne({ _id: id, role: "customer" });
    if (!user) throw new HttpError(404, "This customer was not found.");
    const update = user.active !== data.active
      ? { $set: data, $inc: { authVersion: 1 } }
      : { $set: data };
    const updated = await User.findOneAndUpdate(
      { _id: user._id, role: "customer", authVersion: user.authVersion },
      update,
      { returnDocument: "after", runValidators: true },
    );
    if (!updated) throw new HttpError(409, "This account changed. Refresh the customer list before trying again.");
    return publicUser(updated);
  });
}
