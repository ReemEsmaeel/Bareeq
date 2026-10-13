import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { User } from "@/models/User";
import { requireAdmin, setSession } from "@/lib/auth";
import { checkOrigin, handle, HttpError, validId } from "@/lib/http";
import { canManageAccount, editAccountInput, roleAssignment, settingsAccount, withSettingsChange } from "@/lib/admin-settings";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    checkOrigin(request);
    const sessionActor = await requireAdmin("settings");
    const { id: rawId } = await context.params;
    const id = rawId.toLowerCase();
    validId(id);
    const data = editAccountInput.parse(await request.json());
    const passwordHash = data.newPassword ? await bcrypt.hash(data.newPassword, 12) : undefined;
    const updated = await withSettingsChange(sessionActor, async (actor, session) => {
      const target = await User.findOne({ _id: id, role: { $in: ["admin", "staff"] } })
        .session(session).populate({ path: "roleId", select: "name nameAr permissions", options: { session } });
      if (!target) throw new HttpError(404, "This admin account was not found.");
      if (!canManageAccount(actor, target)) throw new HttpError(403, "You cannot manage an account with greater permissions than your own.");
      const currentRole = target.role === "staff" ? String(target.roleId?._id) : target.role;
      const self = String(actor._id) === id;
      if (self && (data.roleId !== currentRole || !data.active)) {
        throw new HttpError(409, "You cannot change your own role or deactivate your own account.");
      }
      const assignment = await roleAssignment(data.roleId, actor, session);
      const sensitive = data.email !== target.email || data.active !== target.active || data.roleId !== currentRole || !!passwordHash;
      const account = await User.findOneAndUpdate(
        { _id: id, authVersion: target.authVersion },
        {
          $set: { name: data.name, email: data.email, active: data.active, ...assignment, ...(passwordHash ? { passwordHash } : {}) },
          ...(sensitive ? { $inc: { authVersion: 1 } } : {}),
        }, { session, returnDocument: "after", runValidators: true },
      ).populate({ path: "roleId", select: "name nameAr permissions", options: { session } });
      if (!account) throw new HttpError(409, "This account changed. Refresh before trying again.");
      return account;
    });
    if (id === String(sessionActor._id)) await setSession(updated);
    return settingsAccount(updated, sessionActor);
  });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    checkOrigin(request);
    const sessionActor = await requireAdmin("settings");
    const { id: rawId } = await context.params;
    const id = rawId.toLowerCase();
    validId(id);
    await withSettingsChange(sessionActor, async (actor, session) => {
      if (String(actor._id) === id) throw new HttpError(409, "You cannot delete your own administrator account.");
      const target = await User.findOne({ _id: id, role: { $in: ["admin", "staff"] } }).session(session)
        .populate({ path: "roleId", select: "name nameAr permissions", options: { session } });
      if (!target) throw new HttpError(404, "This admin account was not found.");
      if (!canManageAccount(actor, target)) throw new HttpError(403, "You cannot remove an account with greater permissions than your own.");
      await User.deleteOne({ _id: id, authVersion: target.authVersion }, { session });
      // Keep existing order snapshots; deleted identities no longer populate.
    });
    return { success: true };
  });
}
