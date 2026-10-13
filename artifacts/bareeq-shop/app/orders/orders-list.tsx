"use client";

import Link from "next/link";
import { InlineError, OrderStatus, SignInPrompt, PageIntro, StateBlock, ghostBtn, primaryBtn } from "@/components/shop-ui";
import { useShop } from "@/components/shop-provider";
import { useScopedResource } from "@/components/use-fresh";
import { formatDate, formatPrice } from "@/lib/format";
import type { ShopOrder } from "@/lib/types";

const t = {
  en: { kicker: "My orders", title: "Pieces on their way to you.", note: "Status is updated by the atelier. Pending or paid does not mean this app charged you.", emptyT: "No orders yet.", emptyX: "Orders you place will be kept here.", browse: "Explore the collections", errT: "Your orders could not load.", retry: "Try again", order: "Order", view: "View", pieces: (n: number) => `${n} ${n === 1 ? "piece" : "pieces"}` },
  ar: { kicker: "طلباتي", title: "قطعٌ في طريقها إليكِ.", note: "يحدّث الأتيليه حالة الطلب. لا تعني حالة الانتظار أو الدفع أن هذا التطبيق أخذ منكِ أي مبلغ.", emptyT: "لا طلبات بعد.", emptyX: "ستُحفظ هنا الطلبات التي تسجّلينها.", browse: "اكتشفي المجموعات", errT: "تعذّر تحميل طلباتكِ.", retry: "حاولي مجدداً", order: "طلب", view: "عرض", pieces: (n: number) => `${n} قطعة` },
};

export function OrdersList() {
  const { language } = useShop();
  const c = t[language];
  const { data: orders, error, status, reload } = useScopedResource<ShopOrder[]>("/orders");

  return (
    <main className="page-grain mx-auto max-w-[1000px] px-5 pb-24 pt-12 sm:px-9 lg:pt-20">
      <PageIntro kicker={c.kicker} title={c.title}><p className="mt-5 max-w-[520px] text-[12px] leading-[1.8] text-[#796d68]">{c.note}</p></PageIntro>
      <div className="mt-10">
        {orders && error && <InlineError text={`${c.errT} ${error}`} onRetry={() => void reload()} retryLabel={c.retry} />}
        {status === "unauthenticated" ? (
          <SignInPrompt next="/orders" />
        ) : error && !orders ? (
          <StateBlock tone="error" title={c.errT} text={error} action={<button className={ghostBtn} onClick={() => void reload()}>{c.retry}</button>} />
        ) : !orders ? (
          <div className="space-y-3" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse bg-[#2a0006]/[.06]" />)}</div>
        ) : orders.length === 0 ? (
          <StateBlock title={c.emptyT} text={c.emptyX} action={<Link href="/products" className={primaryBtn}>{c.browse}</Link>} />
        ) : (
          <ul className="divide-y divide-[#2a0006]/10 border-y border-[#2a0006]/10">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-6 transition-colors hover:bg-[#f0f5f0] sm:grid-cols-[1.2fr_1fr_auto_auto] sm:px-3">
                  <div>
                    <p className="font-display text-lg text-[#2a0006]">{c.order} <span dir="ltr" className="font-mono text-[13px] text-[#796d68]">#{o.id.slice(-6).toUpperCase()}</span></p>
                    <p className="mt-1 text-[12px] text-[#796d68]">{formatDate(o.createdAt, language)} · {c.pieces(o.items.reduce((s, i) => s + i.quantity, 0))}</p>
                  </div>
                  <div className="sm:justify-self-start"><OrderStatus status={o.status} /></div>
                  <p className="text-[15px] font-semibold tabular-nums text-[#2a0006]">{formatPrice(o.total, language)}</p>
                  <span className="eyebrow hidden text-[#456553] group-hover:underline sm:inline">{c.view}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
