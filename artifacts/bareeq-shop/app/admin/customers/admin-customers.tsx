"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminHeader, AdminLoadState, ConfirmDialog, Notice, RowsSkeleton, adminInput } from "@/components/admin-ui";
import { StateBlock } from "@/components/shop-ui";
import { useShop } from "@/components/shop-provider";
import { useScopedResource } from "@/components/use-fresh";
import { ApiError, api } from "@/lib/client";
import { formatDate } from "@/lib/format";
import type { ShopUser } from "@/lib/types";

const t = {
  en: { kicker: "Customers", title: "The people we make for.", search: "Search by name or email", active: "Active", inactive: "Deactivated", since: "Joined", name: "Name", saveName: "Save name", saving: "Saving", deactivate: "Deactivate", activate: "Reactivate", savedName: "Name saved.", deactivated: "Customer deactivated.", activated: "Customer reactivated.", confirmT: "Deactivate this customer?", confirmBody: "They will be signed out immediately and blocked from signing in or using their account. Their existing orders are preserved.", cancel: "Cancel", emptyT: "No customers yet.", emptyX: "Customers who create an account will appear here.", noMatch: "No customers match this search.", nameErr: "Name must be at least 2 characters." },
  ar: { kicker: "العملاء", title: "من نصنع لأجلهم.", search: "ابحثي بالاسم أو البريد", active: "نشط", inactive: "معطّل", since: "انضم", name: "الاسم", saveName: "حفظ الاسم", saving: "جارٍ الحفظ", deactivate: "تعطيل", activate: "إعادة التفعيل", savedName: "تم حفظ الاسم.", deactivated: "تم تعطيل العميل.", activated: "تمت إعادة تفعيل العميل.", confirmT: "تعطيل هذا العميل؟", confirmBody: "سيتم تسجيل خروجه فوراً ومنعه من الدخول أو استخدام حسابه. تبقى طلباته السابقة محفوظة.", cancel: "إلغاء", emptyT: "لا عملاء بعد.", emptyX: "سيظهر هنا العملاء الذين ينشئون حساباً.", noMatch: "لا عملاء يطابقون هذا البحث.", nameErr: "يجب أن يتكون الاسم من حرفين على الأقل." },
};

export function AdminCustomers() {
  const { language, user } = useShop();
  const c = t[language];
  const r = useScopedResource<ShopUser[]>("/admin/customers");
  const [query, setQuery] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [toDeactivate, setToDeactivate] = useState<ShopUser | null>(null);

  useEffect(() => { setNames({}); setNotice(null); setToDeactivate(null); }, [user?.id]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return r.data?.filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) ?? null;
  }, [r.data, query]);

  async function update(customer: ShopUser, patch: { name?: string; active?: boolean }, success: string) {
    const name = (patch.name ?? customer.name).trim();
    if (name.length < 2) { setNotice({ tone: "error", text: c.nameErr }); return; }
    const guard = r.scopeGuard();
    setBusyId(customer.id);
    setNotice(null);
    try {
      const updated = await api<ShopUser>(`/admin/customers/${customer.id}`, { method: "PATCH", body: { name, active: patch.active ?? customer.active } });
      if (!guard()) return;
      r.setData((l) => l?.map((u) => (u.id === updated.id ? updated : u)) ?? l);
      setNames(({ [customer.id]: _, ...rest }) => rest);
      setNotice({ tone: "ok", text: `${success} ${updated.name}` });
    } catch (err) {
      if (guard()) setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      if (guard()) { setBusyId(null); setToDeactivate(null); }
    }
  }

  return (
    <>
      <AdminHeader kicker={c.kicker} title={c.title} />
      <div className="mt-8">
        {notice && <Notice tone={notice.tone} text={notice.text} />}
        <AdminLoadState status={r.status} errorStatus={r.errorStatus} error={r.error} hasData={!!r.data} onRetry={() => void r.reload()} next="/admin/customers" skeleton={<RowsSkeleton />} />
        {r.data && r.errorStatus !== 403 && (r.data.length === 0 ? <StateBlock title={c.emptyT} text={c.emptyX} /> : (
          <>
            <label htmlFor="c-search" className="sr-only">{c.search}</label>
            <input id="c-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={c.search} className="mb-5 w-full border-0 border-b border-[#2a0006]/25 bg-transparent py-2 text-[14px] outline-none focus:border-[#456553] sm:w-80" />
            {list && list.length === 0 ? <p className="py-8 text-[13px] text-[#796d68]">{c.noMatch}</p> : (
              <ul className="divide-y divide-[#2a0006]/10 border-y border-[#2a0006]/10">
                {list?.map((u) => {
                  const draft = names[u.id] ?? u.name;
                  const busy = busyId === u.id;
                  return (
                    <li key={u.id} className={`grid gap-4 py-5 md:grid-cols-[1fr_1.2fr_auto] md:items-center ${u.active ? "" : "opacity-75"}`}>
                      <div className="min-w-0">
                        <p dir="ltr" className="truncate text-[13px] font-semibold text-[#2a0006] rtl:text-right">{u.email}</p>
                        <p className="mt-1 flex items-center gap-2 text-[12px] text-[#796d68]">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${u.active ? "bg-[#456553]/12 text-[#456553]" : "bg-[#4a0e17]/8 text-[#4a0e17]"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${u.active ? "bg-[#456553]" : "bg-[#4a0e17]"}`} aria-hidden="true" />{u.active ? c.active : c.inactive}
                          </span>
                          {c.since} {formatDate(u.createdAt, language)}
                        </p>
                      </div>
                      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void update(u, { name: draft }, c.savedName); }}>
                        <label htmlFor={`n-${u.id}`} className="sr-only">{c.name}: {u.email}</label>
                        <input id={`n-${u.id}`} value={draft} maxLength={80} disabled={busy} onChange={(e) => setNames((n) => ({ ...n, [u.id]: e.target.value }))} className={adminInput} />
                        <button type="submit" disabled={busy || draft.trim() === u.name} className="whitespace-nowrap bg-[#2a0006] px-4 text-[11px] font-semibold tracking-[.08em] text-[#f6fbf5] hover:bg-[#456553] disabled:opacity-35">{busy ? c.saving : c.saveName}</button>
                      </form>
                      <button disabled={busy} onClick={() => (u.active ? setToDeactivate(u) : void update(u, { active: true }, c.activated))}
                        className={`eyebrow justify-self-start whitespace-nowrap border px-4 py-2.5 transition-colors disabled:opacity-40 md:justify-self-end ${u.active ? "border-[#4a0e17]/30 text-[#4a0e17] hover:bg-[#4a0e17] hover:text-[#f6fbf5]" : "border-[#456553]/40 text-[#456553] hover:bg-[#456553] hover:text-[#f6fbf5]"}`}>
                        {u.active ? c.deactivate : c.activate}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ))}
      </div>
      <ConfirmDialog open={!!toDeactivate} title={c.confirmT}
        body={<><strong dir="ltr" className="text-[#2a0006]">{toDeactivate?.email}</strong><br />{c.confirmBody}</>}
        confirmLabel={busyId ? c.saving : c.deactivate} cancelLabel={c.cancel} busy={!!busyId}
        onConfirm={() => toDeactivate && void update(toDeactivate, { active: false }, c.deactivated)} onCancel={() => !busyId && setToDeactivate(null)} />
    </>
  );
}
