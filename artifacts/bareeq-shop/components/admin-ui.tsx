"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { InlineError, SignInPrompt, StateBlock, ghostBtn, primaryBtn } from "./shop-ui";
import { useShop } from "./shop-provider";
import { hasAdminAccess, hasPermission } from "@/lib/permissions";

const nav = {
  en: { label: "Atelier admin", items: [["/admin", "Overview"], ["/admin/products", "Pieces"], ["/admin/photos", "Photo library"], ["/admin/orders", "Orders"], ["/admin/customers", "Customers"]] },
  ar: { label: "إدارة الأتيليه", items: [["/admin", "نظرة عامة"], ["/admin/products", "القطع"], ["/admin/photos", "مكتبة الصور"], ["/admin/orders", "الطلبات"], ["/admin/customers", "العملاء"]] },
};

export function AdminNav() {
  const { language, user } = useShop();
  const pathname = usePathname();
  const n = nav[language];
  const items = n.items.filter(([href]) => {
    if (href === "/admin") return hasAdminAccess(user);
    if (href === "/admin/products") return hasPermission(user, "products");
    if (href === "/admin/photos") return hasPermission(user, "photos");
    if (href === "/admin/orders") return hasPermission(user, "orders");
    if (href === "/admin/customers") return hasPermission(user, "customers");
    return true;
  });
  const settingsLabel = language === "ar" ? "إعدادات الإدارة" : "Admin settings";
  if (hasPermission(user, "settings")) items.push(["/admin/settings", settingsLabel]);
  return (
    <aside className="lg:sticky lg:top-8 lg:h-fit">
      <p className="eyebrow text-[#456553]">{n.label}</p>
      <nav aria-label={n.label} className="-mx-5 mt-4 flex gap-1 overflow-x-auto border-b border-[#2a0006]/10 px-5 lg:mx-0 lg:flex-col lg:gap-0 lg:border-b-0 lg:border-s lg:px-0">
        {items.map(([href, label]) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-[13px] transition-colors lg:-ms-px lg:border-b-0 lg:border-s-2 lg:px-5 lg:py-2.5 ${active ? "border-[#2a0006] font-semibold text-[#2a0006]" : "border-transparent text-[#796d68] hover:text-[#2a0006]"}`}>
              {label}
            </Link>
          );
        })}
      </nav>
      <Link href="/" className="mt-3 inline-flex text-[10px] font-semibold uppercase tracking-[.13em] text-[#796d68] transition-colors hover:text-[#456553] lg:mt-5">
        {language === "ar" ? "العودة إلى المتجر ←" : "← Back to storefront"}
      </Link>
    </aside>
  );
}

export function AdminHeader({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  const { language } = useShop();
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow text-[#456553]">{kicker}</p>
        <h1 className={`mt-3 font-display text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[1.05] tracking-[-.04em] text-[#2a0006] ${language === "ar" ? "font-arabic !leading-[1.3] tracking-normal" : ""}`}>{title}</h1>
      </div>
      {children}
    </div>
  );
}

/** Explains auth/permission/load failures for admin resources instead of pretending success. */
export function AdminLoadState({ status, errorStatus, error, hasData, onRetry, next, skeleton }: {
  status: string; errorStatus: number | null; error: string; hasData: boolean; onRetry: () => void; next: string; skeleton: ReactNode;
}) {
  const { language } = useShop();
  const ar = language === "ar";
  if (status === "unauthenticated") return <SignInPrompt next={next} />;
  if (errorStatus === 403) return <StateBlock tone="error" title={ar ? "الوصول غير مسموح." : "Administrator access is required."} text={ar ? "هذا الحساب لا يملك صلاحية الإدارة." : "This account no longer has administrator access."} action={<Link href="/account" className={ghostBtn}>{ar ? "حسابي" : "Your account"}</Link>} />;
  if (error && !hasData) return <StateBlock tone="error" title={ar ? "تعذّر التحميل." : "This could not load."} text={error} action={<button className={ghostBtn} onClick={onRetry}>{ar ? "حاولي مجدداً" : "Try again"}</button>} />;
  if (error && hasData) return <InlineError text={error} onRetry={onRetry} retryLabel={ar ? "حاولي مجدداً" : "Try again"} />;
  if (!hasData) return <>{skeleton}</>;
  return null;
}

export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-3" aria-hidden="true">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-20 animate-pulse bg-[#2a0006]/[.06]" />)}</div>;
}

export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, busy, onConfirm, onCancel }: {
  open: boolean; title: string; body: ReactNode; confirmLabel: string; cancelLabel: string; busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onCancelRef.current(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2a0006]/40 p-4 backdrop-blur-sm sm:items-center" onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body" onClick={(e) => e.stopPropagation()} className="reveal w-full max-w-[460px] bg-[#f6fbf5] p-7 shadow-2xl shadow-[#2a0006]/20">
        <h2 id="confirm-title" className="font-display text-2xl text-[#2a0006]">{title}</h2>
        <div id="confirm-body" className="mt-4 text-[13px] leading-[1.8] text-[#675d59]">{body}</div>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref={cancelRef} className={ghostBtn} onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button className={`${primaryBtn} !bg-[#4a0e17] hover:!bg-[#2a0006]`} onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function Notice({ tone, text }: { tone: "ok" | "error"; text: string }) {
  return <p role={tone === "ok" ? "status" : "alert"} className={`mb-6 border-s-2 px-4 py-3 text-[13px] ${tone === "ok" ? "border-[#456553] bg-[#456553]/10 text-[#456553]" : "border-[#4a0e17] bg-[#4a0e17]/5 text-[#4a0e17]"}`}>{text}</p>;
}

export const adminInput = "w-full border border-[#2a0006]/20 bg-[#f6fbf5] px-3 py-2.5 text-[14px] text-[#2a0006] outline-none transition-colors focus:border-[#456553] disabled:opacity-60";
export const adminLabel = "eyebrow mb-2 block text-[#456553]";
