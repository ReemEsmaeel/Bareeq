"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/client";
import { safeNext } from "@/lib/next-path";
import type { ShopUser } from "@/lib/types";
import { AuthShell, buttonClass, fieldClass, labelClass } from "./auth-shell";
import { useShop } from "./shop-provider";

const copy = {
  en: {
    login: {
      kicker: "Welcome back", title: "Return to the atelier.", side: "Your account keeps your details close, ready for the pieces you choose.",
      submit: "Sign in", busy: "Signing in", alt: "New to Bareeq?", altLink: "Create an account",
    },
    signup: {
      kicker: "Join Bareeq", title: "A place for your pieces.", side: "Create an account to keep your details, your bag, and your orders in one quiet place.",
      submit: "Create account", busy: "Creating account", alt: "Already have an account?", altLink: "Sign in",
    },
    name: "Full name", email: "Email", password: "Password", hint: "At least 8 characters.", sideLabel: "BAREEQ ATELIER",
  },
  ar: {
    login: {
      kicker: "أهلاً بعودتكِ", title: "عودي إلى الأتيليه.", side: "يحفظ حسابكِ تفاصيلكِ قريبة، جاهزة للقطع التي تختارينها.",
      submit: "تسجيل الدخول", busy: "جارٍ الدخول", alt: "جديدة في بريق؟", altLink: "أنشئي حساباً",
    },
    signup: {
      kicker: "انضمي إلى بريق", title: "مكانٌ لقطعكِ.", side: "أنشئي حساباً لتحفظي تفاصيلكِ وحقيبتكِ وطلباتكِ في مكان واحد هادئ.",
      submit: "إنشاء الحساب", busy: "جارٍ الإنشاء", alt: "لديكِ حساب؟", altLink: "تسجيل الدخول",
    },
    name: "الاسم الكامل", email: "البريد الإلكتروني", password: "كلمة المرور", hint: "ثمانية أحرف على الأقل.", sideLabel: "أتيليه بريق",
  },
};

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { language, refreshUser } = useShop();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const t = copy[language];
  const m = t[mode];
  const ar = language === "ar";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api<ShopUser>(`/auth/${mode}`, {
        method: "POST",
        body: mode === "signup" ? { name: name.trim(), email: email.trim(), password } : { email: email.trim(), password },
      });
      await refreshUser();
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  const altHref = `${mode === "login" ? "/signup" : "/login"}${params.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <AuthShell
      side={
        <>
          <p className="eyebrow text-[#b7c6b6]">{t.sideLabel}</p>
          <p className={`mt-6 max-w-[340px] font-display text-[clamp(1.7rem,3vw,2.6rem)] italic leading-[1.2] ${ar ? "font-arabic not-italic" : ""}`}>{m.side}</p>
        </>
      }
    >
      <p className="eyebrow text-[#456553]">{m.kicker}</p>
      <h1 className={`mt-4 font-display text-[clamp(2.4rem,5vw,3.6rem)] leading-[1.05] tracking-[-.04em] text-[#2a0006] ${ar ? "font-arabic !leading-[1.35] tracking-normal" : ""}`}>{m.title}</h1>
      <form onSubmit={submit} className="mt-10 space-y-7" noValidate={false}>
        {mode === "signup" && (
          <div>
            <label htmlFor="auth-name" className={labelClass}>{t.name}</label>
            <input id="auth-name" required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} disabled={busy} />
          </div>
        )}
        <div>
          <label htmlFor="auth-email" className={labelClass}>{t.email}</label>
          <input id="auth-email" type="email" required autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} disabled={busy} />
        </div>
        <div>
          <label htmlFor="auth-password" className={labelClass}>{t.password}</label>
          <input id="auth-password" type="password" required minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "signup" ? "new-password" : "current-password"} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClass} disabled={busy} aria-describedby={mode === "signup" ? "auth-hint" : undefined} />
          {mode === "signup" && <p id="auth-hint" className="mt-2 text-[11px] text-[#796d68]">{t.hint}</p>}
        </div>
        {error && <p role="alert" className="border-s-2 border-[#4a0e17] bg-[#4a0e17]/5 px-4 py-3 text-[13px] text-[#4a0e17]">{error}</p>}
        <button type="submit" disabled={busy} className={buttonClass}>{busy ? m.busy : m.submit}</button>
      </form>
      <p className="mt-8 text-[13px] text-[#796d68]">
        {m.alt} <Link href={altHref} className="font-semibold text-[#2a0006] underline-offset-4 hover:underline">{m.altLink}</Link>
      </p>
    </AuthShell>
  );
}
