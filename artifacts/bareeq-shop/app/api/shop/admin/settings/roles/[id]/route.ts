import type { NextRequest } from "next/server";
import { requireAdmin, setSession } from "@/lib/auth";
import { checkOrigin, handle, HttpError, validId } from "@/lib/http";
import { canManagePermissions, roleInput, settingsRole, withSettingsChange } from "@/lib/admin-settings";
import { Role } from "@/models/Role";
import { User } from "@/models/User";

function customId(id: string) {
  if (["admin", "customer"].includes(id)) throw new HttpError(403, "Built-in roles cannot be edited or deleted.");
  validId(id);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    checkOrigin(request);
    const sessionActor = await requireAdmin("settings");
    const { id: rawId } = await context.params;
    const id = rawId.toLowerCase();
    customId(id);
    const data = roleInput.parse(await request.json());
    const result = await withSettingsChange(sessionActor, async (actor, session) => {
      const role = await Role.findById(id).session(session);
      if (!role) throw new HttpError(404, "This role was not found.");
      if (!canManagePermissions(actor, role.permissions) || !canManagePermissions(actor, data.permissions)) {
        throw new HttpError(403, "You cannot manage or grant permissions beyond your own access.");
      }
      if (actor.role === "staff" && String(actor.roleId?._id) === id && !data.permissions.includes("settings")) {
        throw new HttpError(409, "You cannot remove your own admin settings access.");
      }
      const changed = [...role.permissions].sort().join(",") !== [...data.permissions].sort().join(",");
      role.set({ ...data, key: data.name.normalize("NFKC").toLowerCase() });
      await role.save({ session });
      if (changed) await User.updateMany({ role: "staff", roleId: id }, { $inc: { authVersion: 1 } }, { session });
      const count = await User.countDocuments({ role: "staff", roleId: id }).session(session);
      return { role: settingsRole(role, actor, count), renew: changed && actor.role === "staff" && String(actor.roleId?._id) === id };
    });
    if (result.renew) await setSession(await User.findById(sessionActor._id));
    return result.role;
  });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    checkOrigin(request);
    const actor = await requireAdmin("settings");
    const { id: rawId } = await context.params;
    const id = rawId.toLowerCase();
    customId(id);
    await withSettingsChange(actor, async (currentActor, session) => {
      const role = await Role.findById(id).session(session);
      if (!role) throw new HttpError(404, "This role was not found.");
      if (!canManagePermissions(currentActor, role.permissions)) throw new HttpError(403, "You cannot delete a role with greater permissions than your own.");
      if (await User.exists({ roleId: id }).session(session)) {
        throw new HttpError(409, "This role is assigned to accounts. Reassign them before deleting it.");
      }
      await Role.deleteOne({ _id: id }, { session });
    });
    return { success: true };
  });
}
