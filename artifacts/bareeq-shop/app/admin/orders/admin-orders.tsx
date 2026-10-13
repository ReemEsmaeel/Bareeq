"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminHeader, AdminLoadState, Notice, RowsSkeleton, adminInput } from "@/components/admin-ui";
import { OrderStatus, StateBlock } from "@/components/shop-ui";
import { useShop } from "@/components/shop-provider";
import { useScopedResource } from "@/components/use-fresh";
import { ApiError, api } from "@/lib/client";
import { formatDate, formatPrice, normalizeOrderQuery } from "@/lib/format";
import type { ShopOrder } from "@/lib/types";

type Status = ShopOrder["status"];
const t = {
  en: { kicker: "Orders", title: "Recorded orders.", note: "Statuses are recorded manually by the atelier. No payment is taken in this app; marking an order paid only records what happened elsewhere.", search: "Search by customer, email or order", all: "All", pending: "Pending", paid: "Paid", filter: "Filter by status", unknown: "Customer account removed", items: "Pieces", status: "Status", save: "Save status", saving: "Saving", saved: "Status saved.", emptyT: "No orders yet.", emptyX: "Orders customers place will appear here.", noMatch: "No orders match these filters.", total: "Total", details: "Show pieces", hide: "Hide pieces" },
  ar: { kicker: "الطلبات", title: "الطلبات المسجّلة.", note: "يسجّل الأتيليه الحالات يدوياً. لا يتم أخذ أي دفعة في هذا التطبيق؛ وتعيين الطلب كمدفوع يسجّل فقط ما تم خارجه.", search: "ابحثي بالعميل أو البريد أو رقم الطلب", all: "الكل", pending: "قيد الانتظار", paid: "مدفوع", filter: "تصفية حسب الحالة", unknown: "حساب العميل غير موجود", items: "القطع", status: "الحالة", save: "حفظ الحالة", saving: "جارٍ الحفظ", saved: "تم حفظ الحالة.", emptyT: "لا طلبات بعد.", emptyX: "ستظهر هنا طلبات العملاء.", noMatch: "لا طلبات تطابق هذه الفلاتر.", total: "المجموع", details: "عرض القطع", hide: "إخفاء القطع" },
};

export function AdminOrders() {
  const { language, user } = useShop();
  const c = t[language];
  const ar = language === "ar";
  const r = useScopedResource<ShopOrder[]>("/admin/orders");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [drafts, setDrafts] = useState<Record<string, Status>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => { setDrafts({}); setNotice(null); setOpenId(null); }, [user?.id]);

  const list = useMemo(() => {
    const q = normalizeOrderQuery(query);
    return r.data?.filter((o) => (filter === "all" || o.status === filter) && (!q || o.id.toLowerCase().includes(q) || o.customer?.name.toLowerCase().includes(q) || o.customer?.email.toLowerCase().includes(q))) ?? null;
  }, [r.data, query, filter]);

  async function saveStatus(order: ShopOrder) {
    const status = drafts[order.id];
    if (!status || status === order.status) return;
    const guard = r.scopeGuard();
    setSavingId(order.id);
    setNotice(null);
    try {
      const updated = await api<ShopOrder>(`/admin/orders/${order.id}`, { method: "PATCH", body: { status } });
      if (!guard()) return;
      r.setData((list) => list?.map((o) => (o.id === updated.id ? { ...o, ...updated, customer: updated.customer ?? o.customer } : o)) ?? list);
      setDrafts(({ [order.id]: _, ...rest }) => rest);
      setNotice({ tone: "ok", text: `${c.saved} #${order.id.slice(-6).toUpperCase()}` });
    } catch (err) {
      if (guard()) setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      if (guard()) setSavingId(null);
    }
  }

  const chip = (active: boolean) => `border px-4 py-2 text-[11px] font-semibold tracking-[.08em] ${active ? "border-[#2a0006] bg-[#2a0006] text-[#f6fbf5]" : "border-[#2a0006]/20 text-[#2a0006] hover:border-[#2a0006]"}`;

  return (
    <>
      <AdminHeader kicker={c.kicker} title={c.title} />
      <p className="mt-5 max-w-[620px] border-s-2 border-[#456553] ps-3 text-[12px] leading-[1.7] text-[#456553]">{c.note}</p>
      <div className="mt-8">
        {notice && <Notice tone={notice.tone} text={notice.text} />}
        <AdminLoadState status={r.status} errorStatus={r.errorStatus} error={r.error} hasData={!!r.data} onRetry={() => void r.reload()} next="/admin/orders" skeleton={<RowsSkeleton />} />
        {r.data && r.errorStatus !== 403 && (r.data.length === 0 ? <StateBlock title={c.emptyT} text={c.emptyX} /> : (
          <>
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-2" role="group" aria-label={c.filter}>
                {(["all", "pending", "paid"] as const).map((f) => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} className={chip(filter === f)}>{c[f]}</button>)}
              </div>
              <label htmlFor="o-search" className="sr-only">{c.search}</label>
              <input id="o-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={c.search} className="w-full border-0 border-b border-[#2a0006]/25 bg-transparent py-2 text-[14px] outline-none focus:border-[#456553] md:w-80" />
            </div>
            {list && list.length === 0 ? <p className="py-8 text-[13px] text-[#796d68]">{c.noMatch}</p> : (
              <ul className="divide-y divide-[#2a0006]/10 border-y border-[#2a0006]/10">
                {list?.map((o) => {
                  const draft = drafts[o.id] ?? o.status;
                  const busy = savingId === o.id;
                  return (
                    <li key={o.id} className="py-5">
                      <div className="grid gap-4 md:grid-cols-[1.3fr_1fr_auto] md:items-center">
                        <div className="min-w-0">
                          <p className="font-display text-lg text-[#2a0006]"><span dir="ltr" className="font-mono text-[14px]">#{o.id.slice(-6).toUpperCase()}</span> <span className="ms-2"><OrderStatus status={o.status} /></span></p>
                          <p className="mt-1 truncate text-[13px] text-[#2a0006]">{o.customer ? o.customer.name : c.unknown}</p>
                          {o.customer && <p dir="ltr" className="truncate text-[12px] text-[#796d68] rtl:text-right">{o.customer.email}</p>}
                        </div>
                        <div className="text-[12px] text-[#796d68]">
                          <p>{formatDate(o.createdAt, language)}</p>
                          <p className="mt-1 text-[15px] font-semibold tabular-nums text-[#2a0006]">{c.total}: {formatPrice(o.total, language)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label htmlFor={`st-${o.id}`} className="sr-only">{c.status}</label>
                          <select id={`st-${o.id}`} value={draft} disabled={busy} onChange={(e) => setDrafts((d) => ({ ...d, [o.id]: e.target.value as Status }))} className={`${adminInput} w-auto`}>
                            <option value="pending">{c.pending}</option>
                            <option value="paid">{c.paid}</option>
                          </select>
                          <button onClick={() => void saveStatus(o)} disabled={busy || draft === o.status} className="whitespace-nowrap bg-[#2a0006] px-4 py-2.5 text-[11px] font-semibold tracking-[.08em] text-[#f6fbf5] hover:bg-[#456553] disabled:opacity-35">{busy ? c.saving : c.save}</button>
                        </div>
                      </div>
                      <button onClick={() => setOpenId(openId === o.id ? null : o.id)} aria-expanded={openId === o.id} className="eyebrow mt-3 !text-[9px] text-[#456553] hover:underline">{openId === o.id ? c.hide : `${c.details} (${o.items.reduce((s, i) => s + i.quantity, 0)})`}</button>
                      {openId === o.id && (
                        <ul className="mt-3 space-y-1.5 bg-[#f0f5f0] p-4 text-[13px]">
                          {o.items.map((it, i) => (
                            <li key={`${it.product}-${i}`} className="flex justify-between gap-4">
                              <span className="min-w-0 truncate text-[#2a0006]">{ar ? it.nameAr : it.name} <span className="text-[#796d68]">× {it.quantity}</span></span>
                              <span className="shrink-0 tabular-nums text-[#675d59]">{formatPrice(it.price * it.quantity, language)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ))}
      </div>
    </>
  );
}
