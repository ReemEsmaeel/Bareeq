"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CATEGORY_AR, formatPrice } from "@/lib/format";
import type { ShopProduct } from "@/lib/types";
import { useShop } from "./shop-provider";

export function PageIntro({ kicker, title, children }: { kicker: string; title: ReactNode; children?: ReactNode }) {
  const { language } = useShop();
  return (
    <div className="reveal">
      <p className="eyebrow text-[#456553]">{kicker}</p>
      <h1 className={`mt-4 font-display text-[clamp(2.5rem,6vw,4.6rem)] leading-[1.03] tracking-[-.045em] text-[#2a0006] ${language === "ar" ? "font-arabic !leading-[1.3] tracking-normal" : ""}`}>{title}</h1>
      {children}
    </div>
  );
}

export function ProductImage({ product, className = "" }: { product: ShopProduct; className?: string }) {
  const { language } = useShop();
  return (
    <div className={`relative overflow-hidden bg-[#e6ede5] ${className}`}>
      {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image} alt={language === "ar" ? product.nameAr : product.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center font-display text-sm italic text-[#456553]/60">Bareeq</span>
      )}
    </div>
  );
}

export function ProductCard({ product }: { product: ShopProduct }) {
  const { language } = useShop();
  const ar = language === "ar";
  return (
    <Link href={`/products/${product.id}`} className="group block">
      <ProductImage product={product} className="aspect-[.84]" />
      <div className="flex items-start justify-between gap-3 pt-4">
        <div className="min-w-0">
          <p className="eyebrow !text-[9px] text-[#456553]">{ar ? CATEGORY_AR[product.category] : product.category}</p>
          <h3 className={`mt-1 truncate text-[#2a0006] ${ar ? "font-arabic text-[20px]" : "font-display text-[19px]"}`}>{ar ? product.nameAr : product.name}</h3>
        </div>
        <p className="shrink-0 pt-4 text-[13px] font-semibold tabular-nums text-[#2a0006]">{formatPrice(product.price, language)}</p>
      </div>
    </Link>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[.84] animate-pulse bg-[#2a0006]/[.06]" />
          <div className="mt-4 h-3 w-1/3 animate-pulse bg-[#2a0006]/[.06]" />
          <div className="mt-2 h-4 w-2/3 animate-pulse bg-[#2a0006]/[.06]" />
        </div>
      ))}
    </div>
  );
}

export function StateBlock({ title, text, action, tone = "neutral" }: { title: string; text?: string; action?: ReactNode; tone?: "neutral" | "error" }) {
  return (
    <div role={tone === "error" ? "alert" : undefined} className="flex flex-col items-center border border-[#2a0006]/10 bg-[#f0f5f0] px-6 py-16 text-center">
      <span className={`mb-6 h-12 w-12 rounded-full border ${tone === "error" ? "border-[#4a0e17]/50" : "border-[#456553]/50"}`} aria-hidden="true" />
      <h2 className={`font-display text-2xl ${tone === "error" ? "text-[#4a0e17]" : "text-[#2a0006]"}`}>{title}</h2>
      {text && <p className="mt-3 max-w-[380px] text-[13px] leading-[1.8] text-[#796d68]">{text}</p>}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}

export const primaryBtn = "inline-flex items-center justify-center gap-3 bg-[#2a0006] px-6 py-4 text-[11px] font-semibold tracking-[.12em] text-[#f6fbf5] transition-colors hover:bg-[#456553] disabled:cursor-not-allowed disabled:opacity-55";
export const ghostBtn = "inline-flex items-center justify-center gap-2 border border-[#2a0006]/25 px-5 py-3.5 text-[11px] font-semibold tracking-[.1em] text-[#2a0006] transition-colors hover:border-[#2a0006] hover:bg-[#2a0006] hover:text-[#f6fbf5] disabled:opacity-50";

export function QuantityStepper({ value, onChange, min = 1, max = 20, disabled, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; disabled?: boolean; label: string }) {
  return (
    <div className="inline-flex items-center border border-[#2a0006]/20" role="group" aria-label={label}>
      <button type="button" aria-label="-1" disabled={disabled || value <= min} onClick={() => onChange(value - 1)} className="h-11 w-11 text-lg text-[#2a0006] hover:bg-[#2a0006]/5 disabled:opacity-30">−</button>
      <span className="w-10 text-center text-[14px] font-semibold tabular-nums text-[#2a0006]" aria-live="polite">{value}</span>
      <button type="button" aria-label="+1" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className="h-11 w-11 text-lg text-[#2a0006] hover:bg-[#2a0006]/5 disabled:opacity-30">+</button>
    </div>
  );
}

export function OrderStatus({ status }: { status: "pending" | "paid" }) {
  const { language } = useShop();
  const label = language === "ar" ? (status === "paid" ? "مدفوع" : "قيد الانتظار") : (status === "paid" ? "Paid" : "Pending");
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold tracking-[.1em] ${status === "paid" ? "bg-[#456553]/12 text-[#456553]" : "bg-[#4a0e17]/8 text-[#4a0e17]"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "paid" ? "bg-[#456553]" : "bg-[#4a0e17]"}`} aria-hidden="true" />{label}
    </span>
  );
}

export function SignInPrompt({ next }: { next: string }) {
  const { language } = useShop();
  const ar = language === "ar";
  return (
    <StateBlock
      title={ar ? "يرجى تسجيل الدخول." : "Please sign in to continue."}
      text={ar ? "انتهت جلستكِ أو تم تسجيل الخروج." : "Your session has ended or you have signed out."}
      action={<Link href={`/login?next=${encodeURIComponent(next)}`} className={primaryBtn}>{ar ? "تسجيل الدخول" : "Sign in"}</Link>}
    />
  );
}

export function InlineError({ text, onRetry, retryLabel }: { text: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <p role="alert" className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-s-2 border-[#4a0e17] bg-[#4a0e17]/5 px-4 py-3 text-[13px] text-[#4a0e17]">
      {text}
      {onRetry && <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-4">{retryLabel}</button>}
    </p>
  );
}
