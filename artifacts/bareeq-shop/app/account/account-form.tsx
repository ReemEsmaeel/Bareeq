"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthShell, buttonClass, fieldClass, labelClass } from "@/components/auth-shell";
import { useShop } from "@/components/shop-provider";
import { ApiError, api } from "@/lib/client";
import type { ShopUser } from "@/lib/types";

const copy = {
  en: {
    kicker: "Your account", title: "Your details,", titleEm: "kept close.", since: "Member since",
    side: "Update your name or password whenever you need. Your email stays as it is.",
    name: "Full name", email: "Email", emailNote: "Your email cannot be changed here.",
    passwordHeading: "Change password", passwordNote: "Leave blank to keep your current password.",
    current: "Current password", next: "New password", save: "Save changes", saving: "Saving",
    saved: "Your details have been saved.", needCurrent: "Enter your current password to set a new one.",
    short: "Your new password needs at least 8 characters.",
  },
  ar: {
    kicker: "حسابي", title: "تفاصيلكِ،", titleEm: "قريبة منكِ.", since: "عضوة منذ",
    side: "حدّثي اسمكِ أو كلمة المرور متى شئتِ. يبقى بريدكِ الإلكتروني كما هو.",
    name: "الاسم الكامل", email: "البريد الإلكتروني", emailNote: "لا يمكن تغيير البريد الإلكتروني هنا.",
    passwordHeading: "تغيير كلمة المرور", passwordNote: "اتركيها فارغة للإبقاء على كلمة المرور الحالية.",
    current: "كلمة المرور الحالية", next: "كلمة المرور الجديدة", save: "حفظ التغييرات", saving: "جارٍ الحفظ",
    saved: "تم حفظ تفاصيلكِ.", needCurrent: "أدخلي كلمة المرور الحالية لتعيين كلمة جديدة.",
    short: "تحتاج كلمة المرور الجديدة إلى ثمانية أحرف على الأقل.",
  },
};

export function AccountForm({ initialName, email, memberSince }: { initialName: string; email: string; memberSince: string }) {
  const { language, refreshUser } = useShop();
  const router = useRouter();
  const t = copy[language];
  const ar = language === "ar";
  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword && !currentPassword) return setError(t.needCurrent);
    if (newPassword && newPassword.length < 8) return setError(t.short);
    setBusy(true);
    try {
      const body: { name: string; currentPassword?: string; newPassword?: string } = { name: name.trim() };
      if (currentPassword) body.currentPassword = currentPassword;
      if (newPassword) body.newPassword = newPassword;
      const updated = await api<ShopUser>("/account", { method: "PATCH", body });
      setName(updated.name);
      setCurrentPassword("");
      setNewPassword("");
      setSuccess(t.saved);
      await refreshUser();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const since = new Intl.DateTimeFormat(ar ? "ar" : "en", { month: "long", year: "numeric" }).format(new Date(memberSince));

  return (
    <AuthShell
      side={
        <>
          <p className="eyebrow text-[#b7c6b6]">{t.since} · {since}</p>
          <p className="mt-6 font-display text-[clamp(2.2rem,4vw,3.4rem)] leading-[1.05] break-words">{name || initialName}</p>
          <p dir="ltr" className="mt-3 text-[12px] text-[#f6fbf5]/60 break-all">{email}</p>
          <p className={`mt-10 max-w-[320px] text-[13px] leading-[1.9] text-[#f6fbf5]/75 ${ar ? "font-arabic text-[17px]" : ""}`}>{t.side}</p>
        </>
      }
    >
      <p className="eyebrow text-[#456553]">{t.kicker}</p>
      <h1 className={`mt-4 font-display text-[clamp(2.3rem,5vw,3.4rem)] leading-[1.05] tracking-[-.04em] text-[#2a0006] ${ar ? "font-arabic !leading-[1.35] tracking-normal" : ""}`}>
        {t.title} <i>{t.titleEm}</i>
      </h1>
      <form onSubmit={submit} className="mt-10 space-y-7">
        <div>
          <label htmlFor="acc-name" className={labelClass}>{t.name}</label>
          <input id="acc-name" required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} disabled={busy} />
        </div>
        <div>
          <label htmlFor="acc-email" className={labelClass}>{t.email}</label>
          <input id="acc-email" type="email" value={email} readOnly aria-readonly="true" aria-describedby="acc-email-note" dir="ltr" className={`${fieldClass} cursor-not-allowed text-[#796d68]`} />
          <p id="acc-email-note" className="mt-2 text-[11px] text-[#796d68]">{t.emailNote}</p>
        </div>
        <fieldset className="border-t border-[#2a0006]/10 pt-7">
          <legend className="sr-only">{t.passwordHeading}</legend>
          <p className={`font-display text-xl text-[#2a0006] ${ar ? "font-arabic" : ""}`} aria-hidden="true">{t.passwordHeading}</p>
          <p className="mt-1 text-[11px] text-[#796d68]">{t.passwordNote}</p>
          <div className="mt-6 space-y-7">
            <div>
              <label htmlFor="acc-current" className={labelClass}>{t.current}</label>
              <input id="acc-current" type="password" autoComplete="current-password" dir="ltr" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={fieldClass} disabled={busy} />
            </div>
            <div>
              <label htmlFor="acc-new" className={labelClass}>{t.next}</label>
              <input id="acc-new" type="password" autoComplete="new-password" dir="ltr" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={fieldClass} disabled={busy} />
            </div>
          </div>
        </fieldset>
        {error && <p role="alert" className="border-s-2 border-[#4a0e17] bg-[#4a0e17]/5 px-4 py-3 text-[13px] text-[#4a0e17]">{error}</p>}
        {success && <p role="status" className="border-s-2 border-[#456553] bg-[#456553]/10 px-4 py-3 text-[13px] text-[#456553]">{success}</p>}
        <button type="submit" disabled={busy} className={buttonClass}>{busy ? t.saving : t.save}</button>
      </form>
    </AuthShell>
  );
}
