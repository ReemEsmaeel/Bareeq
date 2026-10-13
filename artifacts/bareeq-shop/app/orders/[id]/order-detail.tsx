"use client";

import Link from "next/link";
import { InlineError, OrderStatus, SignInPrompt, StateBlock, ghostBtn } from "@/components/shop-ui";
import { useShop } from "@/components/shop-provider";
import { useScopedResource } from "@/components/use-fresh";
import { formatDate, formatPrice } from "@/lib/format";
import type { ShopOrder } from "@/lib/types";

const t = {
  en: { back: "My orders", kicker: "Order", placed: "Placed", piece: "Piece", qty: "Qty", price: "Price", total: "Total", note: "This order was recorded without taking payment. Its status is managed by the atelier and does not mean this app charged you.", missT: "Order not found.", missX: "It may not exist or may belong to another account.", errT: "This order could not load.", retry: "Try again" },
  ar: { back: "طلباتي", kicker: "طلب", placed: "تاريخ الطلب", piece: "القطعة", qty: "الكمية", price: "السعر", total: "المجموع", note: "سُجّل هذا الطلب دون أخذ أي دفعة. يدير الأتيليه حالته، ولا تعني أن هذا التطبيق أخذ منكِ أي مبلغ.", missT: "الطلب غير موجود.", missX: "ربما لا يوجد أو يخص حساباً آخر.", errT: "تعذّر تحميل هذا الطلب.", retry: "حاولي مجدداً" },
};

export function OrderDetail({ id }: { id: string }) {
  const { language } = useShop();
  const c = t[language];
  const ar = language === "ar";
  const { data: order, error, errorStatus, status, reload } = useScopedResource<ShopOrder>(`/orders/${encodeURIComponent(id)}`);
  const missing = errorStatus !== null && [400, 403, 404].includes(errorStatus);

  return (
    <main className="page-grain mx-auto max-w-[900px] px-5 pb-24 pt-8 sm:px-9 lg:pt-12">
      <Link href="/orders" className="eyebrow inline-flex items-center gap-2 text-[#796d68] hover:text-[#2a0006]"><span aria-hidden="true">{ar ? "→" : "←"}</span>{c.back}</Link>
      <div className="mt-8">
        {status === "unauthenticated" && <SignInPrompt next={`/orders/${id}`} />}
        {order && error && !missing && <InlineError text={`${c.errT} ${error}`} onRetry={() => void reload()} retryLabel={c.retry} />}
        {!order && (status === "auth" || status === "loading") && <div className="space-y-4" aria-hidden="true"><div className="h-14 w-2/3 animate-pulse bg-[#2a0006]/[.06]" /><div className="h-48 animate-pulse bg-[#2a0006]/[.06]" /></div>}
        {missing && <StateBlock title={c.missT} text={c.missX} action={<Link href="/orders" className={ghostBtn}>{c.back}</Link>} />}
        {status === "error" && !order && !missing && <StateBlock tone="error" title={c.errT} text={error} action={<button className={ghostBtn} onClick={() => void reload()}>{c.retry}</button>} />}
        {order && !missing && (
          <div className="reveal">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-[#456553]">{c.kicker}</p>
                <h1 dir="ltr" className="mt-3 font-display text-[clamp(2.2rem,5vw,3.4rem)] tracking-[-.03em] text-[#2a0006]">#{order.id.slice(-6).toUpperCase()}</h1>
                <p className="mt-2 text-[12px] text-[#796d68]">{c.placed} · {formatDate(order.createdAt, language)}</p>
              </div>
              <OrderStatus status={order.status} />
            </div>
            <p className="mt-8 border-s-2 border-[#456553] bg-[#456553]/10 px-4 py-3 text-[12px] leading-[1.7] text-[#456553]">{c.note}</p>
            <table className="mt-10 w-full text-start text-[13px]">
              <thead>
                <tr className="eyebrow border-b border-[#2a0006]/15 text-[#796d68]">
                  <th scope="col" className="pb-3 text-start font-semibold">{c.piece}</th>
                  <th scope="col" className="pb-3 text-center font-semibold">{c.qty}</th>
                  <th scope="col" className="hidden pb-3 text-end font-semibold sm:table-cell">{c.price}</th>
                  <th scope="col" className="pb-3 text-end font-semibold">{c.total}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a0006]/10">
                {order.items.map((item, i) => (
                  <tr key={`${item.product}-${i}`}>
                    <td className="py-5">
                      <span className={`block text-[#2a0006] ${ar ? "font-arabic text-lg" : "font-display text-lg"}`}>{ar ? item.nameAr : item.name}</span>
                      <span className="text-[11px] tabular-nums text-[#796d68] sm:hidden">{formatPrice(item.price, language)}</span>
                    </td>
                    <td className="py-5 text-center tabular-nums">{item.quantity}</td>
                    <td className="hidden py-5 text-end tabular-nums sm:table-cell">{formatPrice(item.price, language)}</td>
                    <td className="py-5 text-end font-semibold tabular-nums text-[#2a0006]">{formatPrice(item.price * item.quantity, language)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#2a0006]/20">
                  <th scope="row" colSpan={2} className="pt-5 text-start font-display text-xl font-normal text-[#2a0006] sm:col-span-3">{c.total}</th>
                  <td className="hidden sm:table-cell" />
                  <td className="pt-5 text-end text-xl font-semibold tabular-nums text-[#2a0006]">{formatPrice(order.total, language)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
