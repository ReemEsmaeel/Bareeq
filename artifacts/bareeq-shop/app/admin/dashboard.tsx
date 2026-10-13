"use client";

import Link from "next/link";
import { AdminHeader, AdminLoadState } from "@/components/admin-ui";
import { useShop } from "@/components/shop-provider";
import { useScopedResource } from "@/components/use-fresh";
import { formatPrice } from "@/lib/format";
import type { AdminSummary } from "@/lib/types";

const t = {
  en: { kicker: "Overview", title: "The atelier, at a glance.", products: "Pieces in the collection", customers: "Customers", orders: "Orders recorded", pending: "Pending orders", value: "Recorded order value", valueNote: "Sum of recorded order totals. No payment is taken in this app; this is not charged revenue.", note: "Order statuses are recorded manually by the atelier.", manage: "Manage" },
  ar: { kicker: "نظرة عامة", title: "الأتيليه في لمحة.", products: "القطع في المجموعة", customers: "العملاء", orders: "الطلبات المسجّلة", pending: "طلبات قيد الانتظار", value: "قيمة الطلبات المسجّلة", valueNote: "مجموع قيم الطلبات المسجّلة. لا يتم أخذ أي دفعة في هذا التطبيق؛ وهذه ليست إيرادات محصّلة.", note: "يسجّل الأتيليه حالات الطلبات يدوياً.", manage: "إدارة" },
};

export function AdminDashboard() {
  const { language } = useShop();
  const c = t[language];
  const r = useScopedResource<AdminSummary>("/admin/summary");
  const s = r.data;
  const tiles = s ? [
    { label: c.products, value: s.products, href: "/admin/products" },
    { label: c.customers, value: s.customers, href: "/admin/customers" },
    { label: c.orders, value: s.orders, href: "/admin/orders" },
    { label: c.pending, value: s.pendingOrders, href: "/admin/orders" },
  ] : [];
  return (
    <>
      <AdminHeader kicker={c.kicker} title={c.title} />
      <div className="mt-10">
        <AdminLoadState status={r.status} errorStatus={r.errorStatus} error={r.error} hasData={!!s} onRetry={() => void r.reload()} next="/admin"
          skeleton={<div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">{[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse bg-[#2a0006]/[.06]" />)}</div>} />
        {s && (
          <>
            <div className="grid grid-cols-2 gap-px bg-[#2a0006]/10 lg:grid-cols-4">
              {tiles.map((tile) => (
                <Link key={tile.label} href={tile.href} className="group bg-[#f6fbf5] p-5 transition-colors hover:bg-[#f0f5f0] sm:p-6">
                  <p className="text-[12px] text-[#796d68]">{tile.label}</p>
                  <p className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] tabular-nums leading-none text-[#2a0006]">{tile.value}</p>
                  <p className="eyebrow mt-4 !text-[9px] text-[#456553] opacity-0 transition-opacity group-hover:opacity-100">{c.manage}</p>
                </Link>
              ))}
            </div>
            <div className="mt-6 bg-[#2a0006] p-6 text-[#f6fbf5] sm:p-8">
              <p className="eyebrow text-[#b7c6b6]">{c.value}</p>
              <p className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] tabular-nums">{formatPrice(s.orderValue, language)}</p>
              <p className="mt-3 max-w-[520px] text-[12px] leading-[1.7] text-[#f6fbf5]/70">{c.valueNote}</p>
            </div>
            <p className="mt-6 text-[12px] text-[#796d68]">{c.note}</p>
          </>
        )}
      </div>
    </>
  );
}
