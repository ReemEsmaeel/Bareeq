"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useShop } from "@/components/shop-provider";
import { api, ApiError } from "@/lib/client";
import { formatPrice } from "@/lib/format";
import type { ShopOrder } from "@/lib/types";

type Result = { orderId: string; status: "pending" | "paid"; sessionState: string };

export function StripeReturn({ sessionId }: { sessionId: string }) {
  const { language } = useShop();
  const ar = language === "ar";
  const [result, setResult] = useState<Result | null>(null);
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const verify = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const verified = await api<Result>("/checkout/confirm", { method: "POST", body: { sessionId } });
      setResult(verified);
      const savedOrder = await api<ShopOrder>(`/orders/${encodeURIComponent(verified.orderId)}`);
      setOrder(savedOrder);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : (ar ? "تعذّر التحقق من الدفع الآن." : "Payment status could not be checked just now."));
    } finally { setBusy(false); }
  }, [sessionId, ar]);

  useEffect(() => { void verify(); }, [verify]);
  const paid = result?.status === "paid";
  return (
    <main className="page-grain mx-auto max-w-[760px] px-5 pb-24 pt-16 sm:px-9 lg:pt-24" dir={ar ? "rtl" : "ltr"}>
      <p className="eyebrow text-[#456553]">{ar ? "حالة الدفع" : "Payment status"}</p>
      <h1 className={`mt-4 text-[clamp(2.3rem,6vw,4rem)] leading-tight text-[#2a0006] ${ar ? "font-arabic" : "font-display"}`}>
        {paid ? (ar ? "تم تأكيد دفعتكِ." : "Payment confirmed.") : (ar ? "جارٍ التحقق من دفعتكِ." : "Checking your payment.")}
      </h1>
      <p role={message ? "alert" : "status"} aria-live="polite" className="mt-5 max-w-[560px] text-[14px] leading-[1.9] text-[#796d68]">
        {message || (paid
          ? (ar ? "تحقّقنا من الدفع لدى Stripe. حُدّث طلبكِ." : "Stripe verified your payment. Your order is updated.")
          : (ar ? "لن نعتبر الدفع ناجحاً قبل أن يؤكده Stripe. يمكنكِ تحديث الحالة أدناه." : "We only mark an order paid after Stripe confirms it. You can check again below."))}
      </p>
      {order && <p className="mt-4 text-[13px] text-[#2a0006]">{ar ? "إجمالي الطلب: " : "Order total: "}{formatPrice(order.total, language, order.currency)}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        {!paid && <button type="button" onClick={() => void verify()} disabled={busy} className="inline-flex min-h-12 items-center justify-center bg-[#2a0006] px-6 py-3 text-[11px] font-semibold tracking-[.1em] text-[#f6fbf5] hover:bg-[#456553] disabled:opacity-60">{busy ? (ar ? "جارٍ التحقق…" : "Checking…") : (ar ? "تحديث حالة الدفع" : "Refresh payment status")}</button>}
        {order && <Link href={`/orders/${order.id}`} className="inline-flex min-h-12 items-center justify-center border border-[#2a0006]/20 px-6 py-3 text-[11px] font-semibold tracking-[.1em] text-[#2a0006] hover:bg-[#f0f5f0]">{ar ? "عرض الطلب" : "View order"}</Link>}
        <Link href="/orders" className="inline-flex min-h-12 items-center justify-center px-4 py-3 text-[11px] font-semibold tracking-[.1em] text-[#456553] underline underline-offset-4">{ar ? "طلباتي" : "My orders"}</Link>
      </div>
    </main>
  );
}
