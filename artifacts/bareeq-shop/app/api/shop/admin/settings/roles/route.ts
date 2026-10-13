import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, handle, HttpError } from "@/lib/http";
import { canManagePermissions, roleInput, settingsRole, withSettingsChange } from "@/lib/admin-settings";
import { ADMIN_PERMISSIONS } from "@/lib/permissions";
import { Role } from "@/models/Role";
import { User } from "@/models/User";

export async function GET() {
  return handle(async () => {
    const actor = await requireAdmin("settings");
    const [roles, counts, admins, customers] = await Promise.all([
      Role.find().sort({ createdAt: -1 }).lean(),
      User.aggregate([{ $match: { role: "staff" } }, { $group: { _id: "$roleId", count: { $sum: 1 } } }]),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "customer" }),
    ]);
    return [
      { id: "admin", name: "Administrator", nameAr: "مدير", permissions: [...ADMIN_PERMISSIONS], builtin: true, assignedUsers: admins, editable: false },
      { id: "customer", name: "Customer", nameAr: "عميل", permissions: [], builtin: true, assignedUsers: customers, editable: false },
      ...roles.map((role: any) => settingsRole(role, actor, counts.find((row: any) => String(row._id) === String(role._id))?.count || 0)),
    ];
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    const sessionActor = await requireAdmin("settings");
    const data = roleInput.parse(await request.json());
    return withSettingsChange(sessionActor, async (actor, session) => {
      if (!canManagePermissions(actor, data.permissions)) throw new HttpError(403, "You cannot grant permissions that you do not have.");
      const [role] = await Role.create([{ ...data, key: data.name.normalize("NFKC").toLowerCase() }], { session });
      return settingsRole(role, actor);
    });
  }, 201);
}
