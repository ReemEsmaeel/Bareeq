import mongoose, { type ClientSession } from "mongoose";
import { z } from "zod";
import { AdminControl } from "@/models/AdminControl";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import { HttpError, validId } from "./http";
import { ADMIN_PERMISSIONS, permissionsFor, type AdminPermission } from "./permissions";
import { publicUser } from "./serialize";
import { nameInput, emailInput, passwordInput } from "./validation";
import type { AdminAccount, AdminRole } from "./types";

export const roleInput = z.object({
  name: nameInput.refine((value) => !["admin", "administrator", "customer"].includes(value.normalize("NFKC").toLowerCase()), "Choose a name other than a built-in role."),
  nameAr: nameInput,
  permissions: z.array(z.enum(ADMIN_PERMISSIONS)).min(1, "Select at least one permission.").max(5)
    .refine((items) => new Set(items).size === items.length, "Permissions must be unique."),
}).strict();

const accountFields = {
  name: nameInput,
  email: emailInput,
  roleId: z.string().refine((value) => ["admin", "customer"].includes(value) || /^[a-f\d]{24}$/i.test(value), "Choose a valid role.").transform((value) => value.toLowerCase()),
  active: z.boolean(),
};
export const createAccountInput = z.object({
  ...accountFields,
  password: passwordInput,
}).strict().refine((value) => value.roleId !== "customer", "New admin accounts need an administrator or custom staff role.");
export const editAccountInput = z.object({
  ...accountFields,
  newPassword: passwordInput.optional(),
}).strict();

export function canManagePermissions(actor: any, permissions: AdminPermission[]) {
  const own = permissionsFor(actor);
  return permissions.every((permission) => own.includes(permission));
}

export function canManageAccount(actor: any, target: any) {
  if (target.role === "admin") return actor.role === "admin";
  return canManagePermissions(actor, permissionsFor(target));
}

export function settingsAccount(user: any, actor: any): AdminAccount {
  return { ...publicUser(user), manageable: canManageAccount(actor, user) };
}

export function settingsRole(role: any, actor: any, assignedUsers = 0): AdminRole {
  return {
    id: String(role._id), name: role.name, nameAr: role.nameAr,
    permissions: role.permissions,
    builtin: false, assignedUsers,
    editable: canManagePermissions(actor, role.permissions),
  };
}

export function assertActiveAdministratorCount(count: number) {
  if (count < 1) {
    throw new HttpError(409, "Keep at least one active full administrator. Create or reactivate another administrator first.");
  }
}

export async function roleAssignment(roleId: string, actor: any, session: ClientSession) {
  if (roleId === "admin") {
    if (actor.role !== "admin") throw new HttpError(403, "Only a full administrator can assign the full Administrator role.");
    return { role: "admin", roleId: null };
  }
  if (roleId === "customer") return { role: "customer", roleId: null };
  validId(roleId);
  const role = await Role.findById(roleId).session(session);
  if (!role) throw new HttpError(404, "This role no longer exists. Refresh the role list.");
  if (!canManagePermissions(actor, role.permissions)) {
    throw new HttpError(403, "You cannot assign permissions that you do not have.");
  }
  return { role: "staff", roleId: role._id };
}

/** All account/role mutations take the same DB lock. This prevents two admins
 * concurrently removing each other or assigning a role while it is deleted. */
export async function withSettingsChange<T>(
  sessionActor: any,
  action: (actor: any, session: ClientSession) => Promise<T>,
): Promise<T> {
  await Promise.all([Role.init(), User.init()]);
  await AdminControl.updateOne({ _id: "management" }, { $setOnInsert: { revision: 0 } }, { upsert: true });
  const session = await mongoose.startSession();
  let result: T | undefined;
  try {
    await session.withTransaction(async () => {
      await AdminControl.updateOne({ _id: "management" }, { $inc: { revision: 1 } }, { session });
      const actor = await User.findOne({
        _id: sessionActor._id, active: true, authVersion: sessionActor.authVersion,
      }).session(session).populate({ path: "roleId", select: "name nameAr permissions", options: { session } });
      if (!actor) throw new HttpError(401, "Your account changed. Sign in again before managing access.");
      if (!permissionsFor(actor).includes("settings")) throw new HttpError(403, "Admin settings permission is required.");
      result = await action(actor, session);
      assertActiveAdministratorCount(await User.countDocuments({ role: "admin", active: true }).session(session));
    });
    return result!;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) {
      throw new HttpError(409, "That email address or role name is already in use.");
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
