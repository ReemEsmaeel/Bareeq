"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AdminHeader, AdminLoadState, ConfirmDialog, Notice, RowsSkeleton, adminInput, adminLabel } from "@/components/admin-ui";
import { useShop } from "@/components/shop-provider";
import { useScopedResource } from "@/components/use-fresh";
import { ApiError, api } from "@/lib/client";
import { ADMIN_PERMISSIONS, hasPermission, PERMISSION_LABELS, type AdminPermission } from "@/lib/permissions";
import type { AdminAccount, AdminRole } from "@/lib/types";
import { ghostBtn, primaryBtn, StateBlock } from "@/components/shop-ui";

type AccountDraft = { name: string; email: string; password: string; roleId: string; active: boolean };
type RoleDraft = { name: string; nameAr: string; permissions: AdminPermission[] };
const emptyAccount: AccountDraft = { name: "", email: "", password: "", roleId: "", active: true };
const emptyRole: RoleDraft = { name: "", nameAr: "", permissions: [] };
const copy = {
  en: {
    kicker: "People & permissions", title: "Admin settings.", accounts: "Team accounts", roles: "Access roles",
    addAccount: "Add account", addRole: "Create role", search: "Accounts", emptyAccounts: "No team accounts to manage.", emptyRoles: "No roles available.",
    name: "Name", email: "Email address", password: "Password", newPassword: "New password · optional", role: "Role", active: "Account active",
    createAccount: "Create account", saveAccount: "Save account", createRole: "Create role", saveRole: "Save role", cancel: "Cancel", saving: "Saving…",
    edit: "Edit", remove: "Delete", activeLabel: "Active", inactiveLabel: "Inactive", memberCount: "assigned accounts", builtin: "Built-in", custom: "Custom",
    enName: "Role name (English)", arName: "Role name (Arabic)", access: "Permissions", minPermission: "Choose at least one permission.",
    passwordHint: "Use 8–72 UTF-8 bytes. Passwords are never shown again after saving.", createSuccess: "Account created.", updateSuccess: "Account updated.", deleteSuccess: "Account permanently deleted.",
    roleCreateSuccess: "Role created.", roleUpdateSuccess: "Role updated.", roleDeleteSuccess: "Role deleted.", deleteAccountTitle: "Permanently delete this account?",
    deleteAccountBody: "This permanently removes the login, profile and cart. Existing order snapshots remain. This cannot be undone.",
    deleteRoleTitle: "Delete this role?", deleteRoleBody: "Accounts must be reassigned before this role can be removed.",
    confirmDelete: "Delete permanently", deleteRole: "Delete role", cancelDelete: "Keep account", cancelRole: "Keep role",
    accountTitleNew: "Add a team account", accountTitleEdit: "Edit account", roleTitleNew: "Create an access role", roleTitleEdit: "Edit access role",
    invalidName: "Enter a name between 1 and 80 characters.", invalidEmail: "Enter a valid email address.", invalidPassword: "Password must be 8–72 characters and UTF-8 bytes.",
    roleFields: "Enter both English and Arabic role names.", inaccessible: "This account is outside your management scope.", roleBlocked: "Accounts are assigned to this role. Reassign them before deletion.",
    currentAccount: "Your account", selfControls: "You can update your own name, email and password here.", noGrantable: "There are no permissions available to grant.", retry: "Try again",
    lastAdmin: "The last active administrator cannot be demoted, deactivated, or deleted.",
  },
  ar: {
    kicker: "الفريق والصلاحيات", title: "إعدادات الإدارة.", accounts: "حسابات الفريق", roles: "أدوار الوصول",
    addAccount: "إضافة حساب", addRole: "إنشاء دور", search: "الحسابات", emptyAccounts: "لا توجد حسابات فريق قابلة للإدارة.", emptyRoles: "لا توجد أدوار متاحة.",
    name: "الاسم", email: "البريد الإلكتروني", password: "كلمة المرور", newPassword: "كلمة مرور جديدة · اختياري", role: "الدور", active: "الحساب نشط",
    createAccount: "إنشاء الحساب", saveAccount: "حفظ الحساب", createRole: "إنشاء الدور", saveRole: "حفظ الدور", cancel: "إلغاء", saving: "جارٍ الحفظ…",
    edit: "تعديل", remove: "حذف", activeLabel: "نشط", inactiveLabel: "غير نشط", memberCount: "حسابات مُعيّنة", builtin: "أساسي", custom: "مخصص",
    enName: "اسم الدور (بالإنجليزية)", arName: "اسم الدور (بالعربية)", access: "الصلاحيات", minPermission: "اختاري صلاحية واحدة على الأقل.",
    passwordHint: "استخدمي ٨–٧٢ بايت UTF-8. لن تظهر كلمة المرور مجدداً بعد الحفظ.", createSuccess: "تم إنشاء الحساب.", updateSuccess: "تم تحديث الحساب.", deleteSuccess: "تم حذف الحساب نهائياً.",
    roleCreateSuccess: "تم إنشاء الدور.", roleUpdateSuccess: "تم تحديث الدور.", roleDeleteSuccess: "تم حذف الدور.", deleteAccountTitle: "حذف هذا الحساب نهائياً؟",
    deleteAccountBody: "سيُحذف تسجيل الدخول والملف والحقيبة نهائياً، مع الاحتفاظ بنسخ الطلبات السابقة. لا يمكن التراجع.",
    deleteRoleTitle: "حذف هذا الدور؟", deleteRoleBody: "يجب إعادة تعيين الحسابات قبل حذف هذا الدور.",
    confirmDelete: "حذف نهائياً", deleteRole: "حذف الدور", cancelDelete: "الاحتفاظ بالحساب", cancelRole: "الاحتفاظ بالدور",
    accountTitleNew: "إضافة حساب للفريق", accountTitleEdit: "تعديل الحساب", roleTitleNew: "إنشاء دور وصول", roleTitleEdit: "تعديل دور الوصول",
    invalidName: "أدخلي اسماً من حرف إلى ٨٠ حرفاً.", invalidEmail: "أدخلي بريداً إلكترونياً صحيحاً.", invalidPassword: "يجب أن تكون كلمة المرور ٨–٧٢ حرفاً وبايت UTF-8.",
    roleFields: "أدخلي اسم الدور باللغتين.", inaccessible: "هذا الحساب خارج نطاق إدارتك.", roleBlocked: "توجد حسابات مرتبطة بهذا الدور. أعيدي تعيينها قبل حذفه.",
    currentAccount: "حسابك", selfControls: "يمكنك تحديث اسمك وبريدك وكلمة مرورك هنا.", noGrantable: "لا توجد صلاحيات متاحة للمنح.", retry: "إعادة المحاولة",
    lastAdmin: "لا يمكن خفض صلاحية آخر مسؤول نشط أو تعطيل حسابه أو حذفه.",
  },
};

export function AdminSettings() {
  const { language, user, authLoading, refreshUser } = useShop();
  const ar = language === "ar";
  const c = copy[language];
  const accounts = useScopedResource<AdminAccount[]>("/admin/settings/users");
  const roles = useScopedResource<AdminRole[]>("/admin/settings/roles");
  const [accountDraft, setAccountDraft] = useState<AccountDraft>(emptyAccount);
  const [roleDraft, setRoleDraft] = useState<RoleDraft>(emptyRole);
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<AdminAccount | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<AdminRole | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const permissionsKey = user?.permissions.join(",") ?? "";
  const identityRef = useRef({ id: user?.id, role: user?.role, roleId: user?.roleId, permissionsKey, active: user?.active, authLoading });
  identityRef.current = { id: user?.id, role: user?.role, roleId: user?.roleId, permissionsKey, active: user?.active, authLoading };
  const grantable = ADMIN_PERMISSIONS.filter((permission) => hasPermission(user, permission));
  const accountScope = accounts.scopeGuard;
  const roleScope = roles.scopeGuard;
  const assignableRoles = (roles.data ?? []).filter((roleItem) =>
    (roleItem.id !== "admin" || user?.role === "admin") &&
    roleItem.permissions.every((permission) => grantable.includes(permission))
  );

  useEffect(() => {
    setAccountFormOpen(false); setRoleFormOpen(false); setEditingAccount(null); setEditingRole(null);
    setAccountToDelete(null); setRoleToDelete(null); setError(""); setNotice(null); setBusy(false);
    setAccountDraft(emptyAccount); setRoleDraft(emptyRole);
  }, [user?.id, user?.role, user?.roleId, permissionsKey, user?.active, authLoading]);

  function guardForMutation() {
    const id = user?.id;
    const role = user?.role;
    const roleId = user?.roleId;
    const currentPermissions = permissionsKey;
    const accountGuard = accountScope();
    const roleGuard = roleScope();
    return () => accountGuard() && roleGuard() && identityRef.current.id === id && identityRef.current.role === role &&
      identityRef.current.roleId === roleId && identityRef.current.permissionsKey === currentPermissions &&
      !!identityRef.current.active && !identityRef.current.authLoading;
  }

  async function reloadBoth(guard: () => boolean) {
    if (!guard()) return;
    await Promise.all([accounts.reload(), roles.reload()]);
  }

  function openNewAccount() {
    const defaultRole = assignableRoles.find((roleItem) => roleItem.id !== "customer");
    setEditingAccount(null);
    setAccountDraft({ ...emptyAccount, roleId: defaultRole?.id ?? roles.data?.find((roleItem) => roleItem.id === "customer")?.id ?? "" });
    setError(""); setNotice(null); setAccountFormOpen(true);
  }

  function openEditAccount(account: AdminAccount) {
    if (!account.manageable && account.id !== user?.id) return;
    setEditingAccount(account);
    setAccountDraft({ name: account.name, email: account.email, password: "", roleId: account.roleId, active: account.active });
    setError(""); setNotice(null); setAccountFormOpen(true);
  }

  function isLastActiveAdmin(account: AdminAccount) {
    return account.role === "admin" && account.active &&
      (accounts.data ?? []).filter((candidate) => candidate.role === "admin" && candidate.active).length === 1;
  }

  async function saveAccount(event: FormEvent) {
    event.preventDefault();
    const name = accountDraft.name.trim();
    const email = accountDraft.email.trim();
    const bytes = new TextEncoder().encode(accountDraft.password).length;
    if (name.length < 1 || name.length > 80) { setError(c.invalidName); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(c.invalidEmail); return; }
    if ((!editingAccount || accountDraft.password) && (accountDraft.password.length < 8 || accountDraft.password.length > 72 || bytes < 8 || bytes > 72)) { setError(c.invalidPassword); return; }
    if (editingAccount && !editingAccount.manageable && editingAccount.id !== user?.id) { setError(c.inaccessible); return; }
    const guard = guardForMutation();
    const self = !!editingAccount && editingAccount.id === user?.id;
    const protectedLastAdmin = !!editingAccount && isLastActiveAdmin(editingAccount);
    const roleId = editingAccount ? (self || protectedLastAdmin ? editingAccount.roleId : accountDraft.roleId) : accountDraft.roleId;
    const active = editingAccount ? (self || protectedLastAdmin ? editingAccount.active : accountDraft.active) : accountDraft.active;
    const body = editingAccount
      ? { name, email, roleId, active, ...(accountDraft.password ? { newPassword: accountDraft.password } : {}) }
      : { name, email, roleId, active, password: accountDraft.password };
    setBusy(true); setError(""); setNotice(null);
    try {
      await api<AdminAccount>(editingAccount ? `/admin/settings/users/${editingAccount.id}` : "/admin/settings/users", {
        method: editingAccount ? "PATCH" : "POST", body,
      });
      if (!guard()) return;
      setAccountDraft((draft) => ({ ...draft, password: "" }));
      setAccountFormOpen(false); setEditingAccount(null);
      setNotice({ tone: "ok", text: editingAccount ? c.updateSuccess : c.createSuccess });
      await reloadBoth(guard);
      await refreshUser();
    } catch (err) {
      if (guard()) setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      if (guard()) setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!accountToDelete?.manageable || accountToDelete.id === user?.id || isLastActiveAdmin(accountToDelete)) return;
    const target = accountToDelete;
    const guard = guardForMutation();
    setBusy(true); setError("");
    try {
      await api<{ success: true }>(`/admin/settings/users/${target.id}`, { method: "DELETE" });
      if (!guard()) return;
      setAccountToDelete(null); setNotice({ tone: "ok", text: c.deleteSuccess });
      await reloadBoth(guard);
      await refreshUser();
    } catch (err) {
      if (guard()) { setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again."); setAccountToDelete(null); }
    } finally {
      if (guard()) setBusy(false);
    }
  }

  function openNewRole() {
    setEditingRole(null); setRoleDraft(emptyRole); setError(""); setNotice(null); setRoleFormOpen(true);
  }

  function openEditRole(roleItem: AdminRole) {
    if (!roleItem.editable || roleItem.builtin) return;
    setEditingRole(roleItem);
    setRoleDraft({ name: roleItem.name, nameAr: roleItem.nameAr, permissions: roleItem.permissions.filter((item) => grantable.includes(item)) });
    setError(""); setNotice(null); setRoleFormOpen(true);
  }

  async function saveRole(event: FormEvent) {
    event.preventDefault();
    const name = roleDraft.name.trim();
    const nameAr = roleDraft.nameAr.trim();
    const permissions = roleDraft.permissions.filter((permission) => grantable.includes(permission));
    if (name.length < 1 || name.length > 80 || nameAr.length < 1 || nameAr.length > 80) { setError(c.roleFields); return; }
    if (!permissions.length) { setError(c.minPermission); return; }
    if (editingRole && (!editingRole.editable || editingRole.builtin)) return;
    const guard = guardForMutation();
    setBusy(true); setError(""); setNotice(null);
    try {
      await api<AdminRole>(editingRole ? `/admin/settings/roles/${editingRole.id}` : "/admin/settings/roles", {
        method: editingRole ? "PUT" : "POST", body: { name, nameAr, permissions },
      });
      if (!guard()) return;
      setRoleFormOpen(false); setEditingRole(null);
      setNotice({ tone: "ok", text: editingRole ? c.roleUpdateSuccess : c.roleCreateSuccess });
      await reloadBoth(guard);
      await refreshUser();
    } catch (err) {
      if (guard()) setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      if (guard()) setBusy(false);
    }
  }

  async function deleteRole() {
    if (!roleToDelete?.editable || roleToDelete.builtin || roleToDelete.assignedUsers > 0) return;
    const target = roleToDelete;
    const guard = guardForMutation();
    setBusy(true); setError("");
    try {
      await api<{ success: true }>(`/admin/settings/roles/${target.id}`, { method: "DELETE" });
      if (!guard()) return;
      setRoleToDelete(null); setNotice({ tone: "ok", text: c.roleDeleteSuccess });
      await reloadBoth(guard);
      await refreshUser();
    } catch (err) {
      if (guard()) { setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again."); setRoleToDelete(null); }
    } finally {
      if (guard()) setBusy(false);
    }
  }

  const protectedLastAdmin = !!editingAccount && isLastActiveAdmin(editingAccount);
  const accountForm: ReactNode = accountFormOpen ? (
    <form onSubmit={(event) => void saveAccount(event)} className="reveal mb-8 border border-[#2a0006]/10 bg-[#f0f5f0] p-5 sm:p-8" aria-labelledby="account-form-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-[#456553]">{editingAccount?.id === user?.id ? c.currentAccount : c.accounts}</p>
          <h2 id="account-form-title" className="mt-2 font-display text-2xl text-[#2a0006]">{editingAccount ? c.accountTitleEdit : c.accountTitleNew}</h2>
          {editingAccount?.id === user?.id && <p className="mt-2 text-[12px] text-[#796d68]">{c.selfControls}</p>}
          {protectedLastAdmin && <p className="mt-2 text-[12px] text-[#796d68]">{c.lastAdmin}</p>}
        </div>
        <button type="button" className={ghostBtn} onClick={() => { setAccountFormOpen(false); setEditingAccount(null); setError(""); }} disabled={busy}>{c.cancel}</button>
      </div>
      <fieldset disabled={busy} className="mt-6 grid gap-5 sm:grid-cols-2">
        <div><label htmlFor="settings-account-name" className={adminLabel}>{c.name}</label><input id="settings-account-name" required minLength={2} maxLength={80} autoComplete="name" value={accountDraft.name} onChange={(event) => setAccountDraft((draft) => ({ ...draft, name: event.target.value }))} className={adminInput} /></div>
        <div><label htmlFor="settings-account-email" className={adminLabel}>{c.email}</label><input id="settings-account-email" required type="email" maxLength={254} autoComplete="email" dir="ltr" value={accountDraft.email} onChange={(event) => setAccountDraft((draft) => ({ ...draft, email: event.target.value }))} className={adminInput} /></div>
        <div><label htmlFor="settings-account-password" className={adminLabel}>{editingAccount ? c.newPassword : c.password}</label><input id="settings-account-password" required={!editingAccount} type="password" maxLength={72} autoComplete="new-password" value={accountDraft.password} onChange={(event) => setAccountDraft((draft) => ({ ...draft, password: event.target.value }))} aria-describedby="settings-password-hint" className={adminInput} /><p id="settings-password-hint" className="mt-2 text-[11px] leading-5 text-[#796d68]">{c.passwordHint}</p></div>
        <div>
          <label htmlFor="settings-account-role" className={adminLabel}>{c.role}</label>
          <select id="settings-account-role" value={accountDraft.roleId} disabled={editingAccount?.id === user?.id || protectedLastAdmin} onChange={(event) => setAccountDraft((draft) => ({ ...draft, roleId: event.target.value }))} className={adminInput}>
            {assignableRoles.filter((item) => !!editingAccount || item.id !== "customer").map((item) => <option key={item.id} value={item.id}>{ar ? item.nameAr : item.name}</option>)}
          </select>
        </div>
        <label className={`flex min-h-11 items-center gap-3 text-[13px] text-[#2a0006] ${editingAccount?.id === user?.id ? "opacity-60" : ""}`}>
          <input type="checkbox" checked={accountDraft.active} disabled={editingAccount?.id === user?.id || protectedLastAdmin} onChange={(event) => setAccountDraft((draft) => ({ ...draft, active: event.target.checked }))} className="h-4 w-4 accent-[#456553]" />
          {c.active}
        </label>
      </fieldset>
      {error && <p role="alert" className="mt-5 border-s-2 border-[#4a0e17] bg-[#4a0e17]/5 px-4 py-3 text-[13px] text-[#4a0e17]">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="submit" className={primaryBtn} disabled={busy || !accountDraft.roleId}>{busy ? c.saving : editingAccount ? c.saveAccount : c.createAccount}</button></div>
    </form>
  ) : null;

  const roleForm: ReactNode = roleFormOpen ? (
    <form onSubmit={(event) => void saveRole(event)} className="reveal mb-8 border border-[#2a0006]/10 bg-[#f0f5f0] p-5 sm:p-8" aria-labelledby="role-form-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="eyebrow text-[#456553]">{c.roles}</p><h2 id="role-form-title" className="mt-2 font-display text-2xl text-[#2a0006]">{editingRole ? c.roleTitleEdit : c.roleTitleNew}</h2></div>
        <button type="button" className={ghostBtn} onClick={() => { setRoleFormOpen(false); setEditingRole(null); setError(""); }} disabled={busy}>{c.cancel}</button>
      </div>
      <fieldset disabled={busy} className="mt-6 grid gap-5 sm:grid-cols-2">
        <div><label htmlFor="settings-role-name" className={adminLabel}>{c.enName}</label><input id="settings-role-name" required minLength={2} maxLength={80} dir="ltr" value={roleDraft.name} onChange={(event) => setRoleDraft((draft) => ({ ...draft, name: event.target.value }))} className={adminInput} /></div>
        <div><label htmlFor="settings-role-name-ar" className={adminLabel}>{c.arName}</label><input id="settings-role-name-ar" required minLength={2} maxLength={80} dir="rtl" value={roleDraft.nameAr} onChange={(event) => setRoleDraft((draft) => ({ ...draft, nameAr: event.target.value }))} className={`${adminInput} font-arabic text-[16px]`} /></div>
      </fieldset>
      <fieldset className="mt-6" disabled={busy}>
        <legend className={adminLabel}>{c.access}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {grantable.map((permission) => <label key={permission} className="flex min-h-11 items-center gap-3 border border-[#2a0006]/10 bg-[#f6fbf5] px-3 text-[13px] text-[#2a0006]">
            <input type="checkbox" checked={roleDraft.permissions.includes(permission)} onChange={(event) => setRoleDraft((draft) => ({ ...draft, permissions: event.target.checked ? [...draft.permissions, permission] : draft.permissions.filter((item) => item !== permission) }))} className="h-4 w-4 accent-[#456553]" />
            {PERMISSION_LABELS[language][permission]}
          </label>)}
        </div>
        {!grantable.length && <p className="mt-3 text-[12px] text-[#796d68]">{c.noGrantable}</p>}
      </fieldset>
      {error && <p role="alert" className="mt-5 border-s-2 border-[#4a0e17] bg-[#4a0e17]/5 px-4 py-3 text-[13px] text-[#4a0e17]">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="submit" className={primaryBtn} disabled={busy || grantable.length === 0}>{busy ? c.saving : editingRole ? c.saveRole : c.createRole}</button></div>
    </form>
  ) : null;

  return (
    <>
      <AdminHeader kicker={c.kicker} title={c.title}>
        <div className="flex flex-wrap gap-2">
          <button className={ghostBtn} onClick={openNewRole} disabled={!roles.data || grantable.length === 0}>{c.addRole}</button>
          <button className={primaryBtn} onClick={openNewAccount} disabled={!roles.data}>{c.addAccount}</button>
        </div>
      </AdminHeader>
      <div className="mt-8">
        {notice && <Notice tone={notice.tone} text={notice.text} />}
        {error && !accountFormOpen && !roleFormOpen && <Notice tone="error" text={error} />}
        {accountForm}
        {roleForm}
        <section aria-labelledby="settings-accounts-heading" className="mb-12">
          <div className="mb-4 flex items-end justify-between gap-3 border-b border-[#2a0006]/15 pb-3">
            <div><p className="eyebrow text-[#456553]">{c.search}</p><h2 id="settings-accounts-heading" className="mt-1 font-display text-2xl text-[#2a0006]">{c.accounts}</h2></div>
            {accounts.data && <span className="text-[11px] tabular-nums text-[#796d68]">{accounts.data.length}</span>}
          </div>
          <AdminLoadState status={accounts.status} errorStatus={accounts.errorStatus} error={accounts.error} hasData={!!accounts.data} onRetry={() => void accounts.reload()} next="/admin/settings" skeleton={<RowsSkeleton rows={3} />} />
          {accounts.data && accounts.errorStatus !== 403 && (accounts.data.length === 0
            ? <StateBlock title={c.emptyAccounts} text={c.selfControls} />
            : <ul className="divide-y divide-[#2a0006]/10 border-y border-[#2a0006]/10">
              {accounts.data.map((account) => {
                const self = account.id === user?.id;
                const canEdit = account.manageable || self;
                return <li key={account.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#456553]/25 bg-[#e8eee7] font-display text-lg text-[#456553]" aria-hidden="true">{account.name.trim().charAt(0).toLocaleUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><p className="truncate font-display text-lg text-[#2a0006]">{account.name}</p>{self && <span className="border border-[#456553]/25 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[.12em] text-[#456553]">{c.currentAccount}</span>}</div>
                      <p dir="ltr" className="truncate text-[12px] text-[#796d68]">{account.email}</p>
                      <p className="mt-1 text-[11px] text-[#456553]">{ar ? account.roleNameAr : account.roleName} <span className="px-1 text-[#796d68]">·</span> {account.active ? c.activeLabel : c.inactiveLabel}</p>
                    </div>
                  </div>
                  {canEdit && <div className="flex shrink-0 gap-4 ps-[52px] sm:ps-0">
                    <button type="button" className="eyebrow text-[#2a0006] hover:text-[#456553]" onClick={() => openEditAccount(account)}>{c.edit}</button>
                    {!self && account.manageable && <button type="button" className="eyebrow text-[#4a0e17] hover:text-[#2a0006] disabled:opacity-35" onClick={() => { if (!isLastActiveAdmin(account)) setAccountToDelete(account); }} disabled={isLastActiveAdmin(account)} aria-label={isLastActiveAdmin(account) ? `${c.remove}: ${c.lastAdmin}` : `${c.remove} ${account.name}`}>{c.remove}</button>}
                  </div>}
                </li>;
              })}
            </ul>
          )}
        </section>
        <section aria-labelledby="settings-roles-heading">
          <div className="mb-4 flex items-end justify-between gap-3 border-b border-[#2a0006]/15 pb-3">
            <div><p className="eyebrow text-[#456553]">{c.access}</p><h2 id="settings-roles-heading" className="mt-1 font-display text-2xl text-[#2a0006]">{c.roles}</h2></div>
            {roles.data && <span className="text-[11px] tabular-nums text-[#796d68]">{roles.data.length}</span>}
          </div>
          <AdminLoadState status={roles.status} errorStatus={roles.errorStatus} error={roles.error} hasData={!!roles.data} onRetry={() => void roles.reload()} next="/admin/settings" skeleton={<RowsSkeleton rows={2} />} />
          {roles.data && roles.errorStatus !== 403 && (roles.data.length === 0
            ? <StateBlock title={c.emptyRoles} text={c.access} />
            : <ul className="divide-y divide-[#2a0006]/10 border-y border-[#2a0006]/10">
              {roles.data.map((roleItem) => <li key={roleItem.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className={`font-display text-xl text-[#2a0006] ${ar ? "font-arabic" : ""}`}>{ar ? roleItem.nameAr : roleItem.name}</h3>
                    <span className="text-[10px] text-[#796d68]">{roleItem.builtin ? c.builtin : c.custom} · {roleItem.assignedUsers} {c.memberCount}</span>
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label={c.access}>
                    {roleItem.permissions.filter((permission) => hasPermission(user, permission)).map((permission) => <li key={permission} className="border border-[#456553]/20 bg-[#456553]/5 px-2.5 py-1 text-[10px] text-[#456553]">{PERMISSION_LABELS[language][permission]}</li>)}
                  </ul>
                  {roleItem.assignedUsers > 0 && roleItem.editable && !roleItem.builtin && <p className="mt-2 text-[10px] text-[#796d68]">{c.roleBlocked}</p>}
                </div>
                {roleItem.editable && !roleItem.builtin && <div className="flex shrink-0 gap-4">
                  <button type="button" className="eyebrow text-[#2a0006] hover:text-[#456553]" onClick={() => openEditRole(roleItem)}>{c.edit}</button>
                  <button type="button" className="eyebrow text-[#4a0e17] hover:text-[#2a0006] disabled:cursor-not-allowed disabled:opacity-35" onClick={() => setRoleToDelete(roleItem)} disabled={roleItem.assignedUsers > 0} aria-describedby={roleItem.assignedUsers > 0 ? `role-blocked-${roleItem.id}` : undefined}>{c.remove}</button>
                  {roleItem.assignedUsers > 0 && <span id={`role-blocked-${roleItem.id}`} className="sr-only">{c.roleBlocked}</span>}
                </div>}
              </li>)}
            </ul>
          )}
        </section>
      </div>
      <ConfirmDialog open={!!accountToDelete} title={c.deleteAccountTitle} body={<><strong className="text-[#2a0006]">{accountToDelete?.name}</strong><br />{c.deleteAccountBody}</>} confirmLabel={busy ? c.saving : c.confirmDelete} cancelLabel={c.cancelDelete} busy={busy} onConfirm={() => void deleteAccount()} onCancel={() => !busy && setAccountToDelete(null)} />
      <ConfirmDialog open={!!roleToDelete} title={c.deleteRoleTitle} body={<><strong className="text-[#2a0006]">{roleToDelete && (ar ? roleToDelete.nameAr : roleToDelete.name)}</strong><br />{c.deleteRoleBody}</>} confirmLabel={busy ? c.saving : c.deleteRole} cancelLabel={c.cancelRole} busy={busy} onConfirm={() => void deleteRole()} onCancel={() => !busy && setRoleToDelete(null)} />
    </>
  );
}
