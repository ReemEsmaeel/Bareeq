"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/client";
import type { ShopOrder } from "@/lib/types";

export function PayOrderButton({ order, language }: { order: ShopOrder; language: "en" | "ar" }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const ar = language === "ar";
  async function pay() {
    if (busy || order.status === "paid") return;
    setBusy(true);
    setMessage("");
    try {
      const result = await api<{ url: string; orderId: string }>("/checkout", {
        method: "POST", body: { orderId: order.id },
      });
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com" ||
          url.username || url.password || result.orderId !== order.id) {
        throw new Error("Stripe returned an unexpected checkout address.");
      }
      window.location.assign(url.toString());
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : (ar ? "تعذّر بدء الدفع. لم يتم خصم أي مبلغ." : "Checkout could not start. You have not been charged."));
      setBusy(false);
    }
  }
  if (order.paymentProvider !== "stripe" || order.status === "paid") return null;
  return (
    <div className="mt-6 space-y-3">
      <p className="text-[12px] leading-[1.7] text-[#796d68]">
        {ar ? "دفع تجريبي آمن عبر Stripe. لن يتم خصم أي مبلغ حقيقي." : "Secure Stripe test checkout. No real charge will be made."}
      </p>
      {message && <p role="alert" className="border-s-2 border-[#4a0e17] bg-[#4a0e17]/5 px-4 py-3 text-[12px] text-[#4a0e17]">{message}</p>}
      <button type="button" onClick={() => void pay()} disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center bg-[#2a0006] px-6 py-3 text-[11px] font-semibold tracking-[.1em] text-[#f6fbf5] transition-colors hover:bg-[#456553] disabled:cursor-wait disabled:opacity-60">
        {busy ? (ar ? "جارٍ الاتصال بـ Stripe…" : "Connecting to Stripe…") : (ar ? "الدفع عبر Stripe" : "Pay securely with Stripe")}
      </button>
    </div>
  );
}
