"use client";

import Link from "next/link";
import { AdminHeader, AdminLoadState } from "@/components/admin-ui";
import { useShop } from "@/components/shop-provider";
import { useScopedResource } from "@/components/use-fresh";
import { formatPrice } from "@/lib/format";
import type { AdminSummary } from "@/lib/types";
import { hasPermission } from "@/lib/permissions";

const t = {
  en: {
    kicker: "Atelier overview", title: "The house, in view.", add: "Add a piece", storefront: "View storefront",
    products: "Pieces", customers: "Customers", orders: "Orders", pending: "Awaiting attention", paid: "Marked paid", active: "Active customers", photos: "Library photographs",
    value: "Recorded order value", valueNote: "A record of submitted order totals only. This app does not accept payment; this is not collected revenue.",
    recent: "Latest orders", seeOrders: "All orders", empty: "No orders have arrived yet.", order: "Order", client: "Customer", date: "Placed", total: "Total", state: "Status",
    pendingState: "Pending", paidState: "Paid", collection: "Collections", note: "Order statuses are recorded manually by the atelier.", manage: "Open",
    collectionNames: { Lujain: "Lujain", Rawnaq: "Rawnaq", Wahaj: "Wahaj" },
  },
  ar: {
    kicker: "نظرة عامة على الأتيليه", title: "الدار، كما هي الآن.", add: "إضافة قطعة", storefront: "عرض المتجر",
    products: "القطع", customers: "العملاء", orders: "الطلبات", pending: "بانتظار المتابعة", paid: "المسجّلة كمدفوعة", active: "العملاء النشطون", photos: "صور المكتبة",
    value: "قيمة الطلبات المسجّلة", valueNote: "مجموع قيم الطلبات المرسلة فقط. لا يقبل هذا التطبيق المدفوعات؛ وهذا ليس دخلاً محصّلاً.",
    recent: "أحدث الطلبات", seeOrders: "كل الطلبات", empty: "لم تصل أي طلبات بعد.", order: "الطلب", client: "العميل", date: "التاريخ", total: "الإجمالي", state: "الحالة",
    pendingState: "قيد الانتظار", paidState: "مدفوع", collection: "المجموعات", note: "يسجّل الأتيليه حالات الطلبات يدوياً.", manage: "فتح",
    collectionNames: { Lujain: "لجين", Rawnaq: "رونق", Wahaj: "وهج" },
  },
};

export function AdminDashboard() {
  const { language, user } = useShop();
  const c = t[language];
  const ar = language === "ar";
  const canProducts = hasPermission(user, "products");
  const canCustomers = hasPermission(user, "customers");
  const canOrders = hasPermission(user, "orders");
  const canPhotos = hasPermission(user, "photos");
  const canSettings = hasPermission(user, "settings");
  const resource = useScopedResource<AdminSummary>("/admin/summary");
  const summary = resource.data;
  const metrics = summary ? [
    ...(canProducts && summary.products !== null ? [{ label: c.products, number: summary.products, href: "/admin/products", sign: "01" }] : []),
    ...(canCustomers && summary.customers !== null ? [{ label: c.customers, number: summary.customers, href: "/admin/customers", sign: "02" }] : []),
    ...(canOrders && summary.orders !== null ? [
      { label: c.orders, number: summary.orders, href: "/admin/orders", sign: "03" },
      ...(summary.pendingOrders !== null ? [{ label: c.pending, number: summary.pendingOrders, href: "/admin/orders", sign: "04" }] : []),
      ...(summary.paidOrders !== null ? [{ label: c.paid, number: summary.paidOrders, href: "/admin/orders", sign: "05" }] : []),
    ] : []),
    ...(canCustomers && summary.activeCustomers !== null ? [{ label: c.active, number: summary.activeCustomers, href: "/admin/customers", sign: "06" }] : []),
    ...(canPhotos && summary.photoCount !== null ? [{ label: c.photos, number: summary.photoCount, href: "/admin/photos", sign: "07" }] : []),
  ] : [];
  return (
    <>
      <AdminHeader kicker={c.kicker} title={c.title}>
        <div className="flex flex-wrap gap-2">
          {canProducts && <Link href="/admin/products?new=1" className="inline-flex min-h-11 items-center bg-[#2a0006] px-5 text-[12px] font-semibold text-[#f6fbf5] transition-colors hover:bg-[#456553]">{c.add}</Link>}
          {canSettings && <Link href="/admin/settings" className="inline-flex min-h-11 items-center border border-[#456553]/40 px-5 text-[12px] font-semibold text-[#456553] transition-colors hover:bg-[#456553]/10">{ar ? "إعدادات الإدارة" : "Admin settings"}</Link>}
          <Link href="/" className="inline-flex min-h-11 items-center border border-[#2a0006]/20 px-5 text-[12px] font-semibold text-[#2a0006] transition-colors hover:border-[#456553] hover:text-[#456553]">{c.storefront}</Link>
        </div>
      </AdminHeader>
      <div className="mt-9">
        <AdminLoadState status={resource.status} errorStatus={resource.errorStatus} error={resource.error} hasData={!!summary} onRetry={() => void resource.reload()} next="/admin" skeleton={<div className="grid grid-cols-2 gap-px bg-[#2a0006]/10 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <div key={i} className="h-28 animate-pulse bg-[#f0f5f0]" />)}</div>} />
        {summary && (
          <>
            {metrics.length > 0 && <section aria-label={ar ? "ملخص الإدارة" : "Admin summary"} className="grid grid-cols-2 gap-px bg-[#2a0006]/10 sm:grid-cols-3 lg:grid-cols-4">
              {metrics.map((metric, index) => (
                <Link key={metric.sign} href={metric.href} className={`group relative min-h-28 bg-[#f0f5f0] p-4 transition-colors hover:bg-[#e9f0e9] sm:p-5 ${index === 0 ? "row-span-2 flex min-h-[14.5rem] flex-col justify-between bg-[#e8eee7] sm:min-h-[14.5rem]" : ""}`}>
                  <span className="eyebrow text-[#456553]/75">{metric.sign}</span>
                  <span className={`mt-4 block text-[11px] text-[#796d68] ${index === 0 ? "mt-auto" : ""}`}>{metric.label}</span>
                  <span className="mt-1 block font-display text-[clamp(1.8rem,3.5vw,2.7rem)] leading-none tabular-nums text-[#2a0006]">{metric.number}</span>
                  <span className="absolute end-4 top-4 text-[#456553] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">↗</span>
                </Link>
              ))}
              {canPhotos && <Link href="/admin/photos" className="flex min-h-28 flex-col justify-between bg-[#456553] p-5 text-[#f6fbf5] transition-colors hover:bg-[#355443]">
                <span className="eyebrow text-[#f6fbf5]/70">{ar ? "الصورة العامة" : "THE PUBLIC IMAGE"}</span>
                <span className="font-display text-[18px] leading-tight">{ar ? "إدارة صور المنتجات" : "Manage product photography"}</span>
                <span className="text-[11px] text-[#f6fbf5]/75">{ar ? "مكتبة الصور ←" : "Open photo library →"}</span>
              </Link>}
            </section>}

            {(canOrders && summary.orderValue !== null || canProducts) && <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(240px,.7fr)]">
              {canOrders && summary.orderValue !== null && <div className="bg-[#2a0006] p-6 text-[#f6fbf5] sm:p-8">
                <p className="eyebrow text-[#b7c6b6]">{c.value}</p>
                <p className="mt-3 font-display text-[clamp(2.2rem,5vw,3.8rem)] leading-none tabular-nums">{formatPrice(summary.orderValue, language)}</p>
                <p className="mt-4 max-w-[560px] text-[11px] leading-[1.8] text-[#f6fbf5]/65">{c.valueNote}</p>
                <p className="mt-6 border-t border-[#f6fbf5]/15 pt-4 text-[11px] text-[#b7c6b6]">{c.note}</p>
              </div>}
              {canProducts && <div className="border border-[#2a0006]/10 bg-[#f0f5f0] p-6 sm:p-7">
                <p className="eyebrow text-[#456553]">{c.collection}</p>
                <ul className="mt-5 divide-y divide-[#2a0006]/10">
                  {summary.collections.map((item) => (
                    <li key={item.category} className="flex items-baseline justify-between gap-3 py-3">
                      <span className={`font-display text-lg text-[#2a0006] ${ar ? "font-arabic" : ""}`}>{c.collectionNames[item.category]}</span>
                      <span className="text-[12px] tabular-nums text-[#796d68]">{item.count}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/admin/products" className="mt-4 inline-block text-[11px] font-semibold text-[#456553] underline underline-offset-4">{c.manage}</Link>
              </div>}
            </section>
            }

            {canOrders && <section className="mt-10">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#2a0006]/15 pb-4">
                <div><p className="eyebrow text-[#456553]">{c.recent}</p><h2 className="mt-2 font-display text-2xl text-[#2a0006]">{c.orders}</h2></div>
                <Link href="/admin/orders" className="text-[11px] font-semibold text-[#456553] underline underline-offset-4">{c.seeOrders}</Link>
              </div>
              {summary.latestOrders.length === 0 ? <p className="py-9 text-[13px] text-[#796d68]">{c.empty}</p> : (
                <>
                  <div className="hidden grid-cols-[1fr_1.3fr_1fr_1fr_auto] gap-4 py-3 text-[9px] font-bold uppercase tracking-[.16em] text-[#796d68] sm:grid">
                    <span>{c.order}</span><span>{c.client}</span><span>{c.date}</span><span>{c.total}</span><span>{c.state}</span>
                  </div>
                  <ul className="divide-y divide-[#2a0006]/10 border-b border-[#2a0006]/10">
                    {summary.latestOrders.map((order) => (
                      <li key={order.id}>
                        <Link href="/admin/orders" className="grid gap-2 py-4 transition-colors hover:bg-[#f0f5f0] sm:grid-cols-[1fr_1.3fr_1fr_1fr_auto] sm:items-center sm:gap-4 sm:px-2">
                          <span className="font-display text-[16px] text-[#2a0006]">{order.id.slice(-8)}</span>
                          <span className={`truncate text-[12px] text-[#796d68] ${ar ? "font-arabic" : ""}`}>{order.customer?.name || "—"}</span>
                          <time className="text-[11px] text-[#796d68]" dateTime={order.createdAt}>{new Intl.DateTimeFormat(ar ? "ar-SA" : "en", { dateStyle: "medium" }).format(new Date(order.createdAt))}</time>
                          <span className="text-[12px] tabular-nums text-[#2a0006]">{formatPrice(order.total, language)}</span>
                          <span className={`w-fit border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.1em] ${order.status === "paid" ? "border-[#456553]/30 bg-[#456553]/10 text-[#456553]" : "border-[#4a0e17]/20 bg-[#4a0e17]/5 text-[#4a0e17]"}`}>{order.status === "paid" ? c.paidState : c.pendingState}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>}
            {!metrics.length && canSettings && <section className="mt-6 border border-[#2a0006]/10 bg-[#f0f5f0] p-7 sm:p-9">
              <p className="eyebrow text-[#456553]">{ar ? "مساحة الإدارة" : "Your admin workspace"}</p>
              <h2 className="mt-3 font-display text-2xl text-[#2a0006]">{ar ? "إعدادات الحساب والصلاحيات." : "Accounts and permissions."}</h2>
              <p className="mt-2 max-w-xl text-[13px] leading-6 text-[#796d68]">{ar ? "تديرين من هنا حسابات فريق الأتيليه والأدوار المسموح لك بإدارتها." : "Manage atelier team accounts and the roles within your permission scope."}</p>
              <Link href="/admin/settings" className="mt-5 inline-flex min-h-11 items-center bg-[#2a0006] px-5 text-[12px] font-semibold text-[#f6fbf5] hover:bg-[#456553]">{ar ? "فتح الإعدادات" : "Open settings"}</Link>
            </section>}
          </>
        )}
      </div>
    </>
  );
}
