import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, handle } from "@/lib/http";
import { createAccountInput, roleAssignment, settingsAccount, withSettingsChange } from "@/lib/admin-settings";
import { User } from "@/models/User";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  return handle(async () => {
    const actor = await requireAdmin("settings");
    const users = await User.find({ role: { $in: ["admin", "staff"] } })
      .sort({ createdAt: -1 }).populate("roleId", "name nameAr permissions").lean();
    return users.map((user: any) => settingsAccount(user, actor));
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    const sessionActor = await requireAdmin("settings");
    const data = createAccountInput.parse(await request.json());
    await rateLimit(request, "admin-account-create", 20, 15, String(sessionActor._id));
    const hash = await bcrypt.hash(data.password, 12);
    return withSettingsChange(sessionActor, async (actor, session) => {
      const assignment = await roleAssignment(data.roleId, actor, session);
      const [created] = await User.create([{
        name: data.name, email: data.email, passwordHash: hash,
        ...assignment, active: data.active,
      }], { session });
      await created.populate({ path: "roleId", select: "name nameAr permissions", options: { session } });
      return settingsAccount(created, actor);
    });
  }, 201);
}
