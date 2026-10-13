"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { InlineError, PageIntro, SignInPrompt, ProductImage, QuantityStepper, StateBlock, ghostBtn, primaryBtn } from "@/components/shop-ui";
import { useShop } from "@/components/shop-provider";
import { useScopedResource } from "@/components/use-fresh";
import { ApiError, api } from "@/lib/client";
import { CATEGORY_AR, formatPrice } from "@/lib/format";
import type { ShopCart, ShopOrder } from "@/lib/types";

const t = {
  en: { kicker: "Your bag", title: "Kept aside for you.", qty: "Quantity", remove: "Remove", clear: "Clear bag", confirmClear: "Remove every piece from your bag?", total: "Total", place: "Place order", placing: "Placing order", note: "Placing an order records it with the atelier. No payment is taken in this app.", removed: "Some pieces are no longer available and have been left out of your bag.", emptyT: "Your bag is empty.", emptyX: "When a piece speaks to you, it will wait here.", browse: "Explore the collections", errT: "Your bag could not load.", retry: "Try again", review: "Please review the updated bag, then place your order again.", reloadFailed: "The updated bag could not be loaded. Refresh it successfully before placing your order.", summary: "Summary", items: (n: number) => `${n} ${n === 1 ? "piece" : "pieces"}` },
  ar: { kicker: "حقيبتكِ", title: "محفوظة لأجلكِ.", qty: "الكمية", remove: "إزالة", clear: "إفراغ الحقيبة", confirmClear: "إزالة كل القطع من حقيبتكِ؟", total: "المجموع", place: "تأكيد الطلب", placing: "جارٍ تسجيل الطلب", note: "تأكيد الطلب يسجّله لدى الأتيليه. لا يتم أخذ أي دفعة في هذا التطبيق.", removed: "بعض القطع لم تعد متاحة وتم استبعادها من حقيبتكِ.", emptyT: "حقيبتكِ فارغة.", emptyX: "حين تلامسكِ قطعة، ستنتظركِ هنا.", browse: "اكتشفي المجموعات", errT: "تعذّر تحميل حقيبتكِ.", retry: "حاولي مجدداً", review: "يرجى مراجعة الحقيبة المحدّثة ثم تأكيد الطلب مجدداً.", reloadFailed: "تعذّر تحميل الحقيبة المحدّثة. يرجى تحديثها بنجاح قبل تأكيد الطلب.", summary: "الملخص", items: (n: number) => `${n} قطعة` },
};

export function CartView() {
  const { language, user } = useShop();
  const c = t[language];
  const ar = language === "ar";
  const router = useRouter();
  const { data: cart, setData: setCart, error: loadError, status, reload, scopeGuard } = useScopedResource<ShopCart>("/cart");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState("");
  const [needsRefresh, setNeedsRefresh] = useState(false);

  // Reset action state when the account changes.
  useEffect(() => { setMessage(""); setNeedsRefresh(false); setBusyId(null); setPlacing(false); }, [user?.id]);
  // A successful fresh load clears the "must refresh" block.
  useEffect(() => { if (status === "ready" && !loadError) setNeedsRefresh(false); }, [status, loadError, cart]);

  async function retryLoad() {
    if (await reload()) setNeedsRefresh(false);
  }

  async function mutate(method: "PATCH" | "DELETE", key: string, body?: { productId: string; quantity: number }) {
    const isCurrent = scopeGuard();
    setBusyId(key);
    setMessage("");
    try {
      const next = await api<ShopCart>("/cart", { method, body });
      if (isCurrent()) setCart(next);
    } catch (err) {
      if (isCurrent()) setMessage(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      if (isCurrent()) setBusyId(null);
    }
  }

  async function place() {
    if (!cart || needsRefresh) return;
    const isCurrent = scopeGuard();
    setPlacing(true);
    setMessage("");
    try {
      const order = await api<ShopOrder>("/orders", { method: "POST", body: { quote: cart.quote } });
      if (!isCurrent()) return;
      router.push(`/orders/${order.id}`);
      router.refresh();
    } catch (err) {
      if (!isCurrent()) return;
      const text = err instanceof ApiError ? err.message : "Something went wrong.";
      if (err instanceof ApiError && err.status === 409) {
        setNeedsRefresh(true);
        const refreshed = await reload();
        if (!isCurrent()) return;
        if (refreshed) {
          setNeedsRefresh(false);
          setMessage(`${text} ${c.review}`);
        } else {
          setMessage(`${text} ${c.reloadFailed}`);
        }
      } else {
        setMessage(text);
      }
      setPlacing(false);
    }
  }

  const count = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const busy = placing || busyId !== null;
  const blocked = busy || needsRefresh || status !== "ready";

  return (
    <main className="page-grain mx-auto max-w-[1240px] px-5 pb-24 pt-12 sm:px-9 lg:pt-20">
      <PageIntro kicker={c.kicker} title={c.title} />
      <div className="mt-10">
        {status === "unauthenticated" ? (
          <SignInPrompt next="/cart" />
        ) : loadError && !cart ? (
          <StateBlock tone="error" title={c.errT} text={loadError} action={<button className={ghostBtn} onClick={() => void retryLoad()}>{c.retry}</button>} />
        ) : !cart ? (
          <div className="space-y-4" aria-hidden="true">{[0, 1].map((i) => <div key={i} className="h-32 animate-pulse bg-[#2a0006]/[.06]" />)}</div>
        ) : (
          <>
            {loadError && <InlineError text={`${c.errT} ${loadError}`} onRetry={() => void retryLoad()} retryLabel={c.retry} />}
            {needsRefresh && !message && <InlineError text={c.reloadFailed} onRetry={() => void retryLoad()} retryLabel={c.retry} />}
            {cart.removedItems && <p role="status" className="mb-6 border-s-2 border-[#4a0e17] bg-[#4a0e17]/5 px-4 py-3 text-[13px] text-[#4a0e17]">{c.removed}</p>}
            {message && <p role="alert" className="mb-6 border-s-2 border-[#4a0e17] bg-[#4a0e17]/5 px-4 py-3 text-[13px] text-[#4a0e17]">{message}</p>}
            {cart.items.length === 0 ? (
              <StateBlock title={c.emptyT} text={c.emptyX} action={<Link href="/products" className={primaryBtn}>{c.browse}</Link>} />
            ) : (
              <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
                <ul className="divide-y divide-[#2a0006]/10 border-y border-[#2a0006]/10">
                  {cart.items.map(({ product, quantity }) => (
                    <li key={product.id} className={`flex gap-4 py-6 sm:gap-6 ${busyId === product.id ? "opacity-60" : ""}`}>
                      <Link href={`/products/${product.id}`} className="group w-24 shrink-0 sm:w-32"><ProductImage product={product} className="aspect-[.84]" /></Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="eyebrow !text-[9px] text-[#456553]">{ar ? CATEGORY_AR[product.category] : product.category}</p>
                            <Link href={`/products/${product.id}`} className={`mt-1 block truncate text-[#2a0006] hover:underline ${ar ? "font-arabic text-xl" : "font-display text-xl"}`}>{ar ? product.nameAr : product.name}</Link>
                            <p className="mt-1 text-[12px] tabular-nums text-[#796d68]">{formatPrice(product.price, language)}</p>
                          </div>
                          <p className="shrink-0 text-[14px] font-semibold tabular-nums text-[#2a0006]">{formatPrice(product.price * quantity, language)}</p>
                        </div>
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                          <QuantityStepper value={quantity} min={1} disabled={busy} label={`${c.qty}: ${ar ? product.nameAr : product.name}`} onChange={(n) => mutate("PATCH", product.id, { productId: product.id, quantity: n })} />
                          <button disabled={busy} onClick={() => mutate("PATCH", product.id, { productId: product.id, quantity: 0 })} className="eyebrow text-[#796d68] underline-offset-4 hover:text-[#4a0e17] hover:underline disabled:opacity-50">{c.remove}</button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <aside className="h-fit bg-[#f0f5f0] p-6 sm:p-8 lg:sticky lg:top-6">
                  <p className="eyebrow text-[#456553]">{c.summary}</p>
                  <div className="mt-6 flex items-baseline justify-between border-b border-[#2a0006]/10 pb-5">
                    <span className="text-[13px] text-[#796d68]">{c.items(count)}</span>
                  </div>
                  <div className="mt-5 flex items-baseline justify-between">
                    <span className="font-display text-xl text-[#2a0006]">{c.total}</span>
                    <span className="text-[24px] font-semibold tabular-nums text-[#2a0006]">{formatPrice(cart.total, language)}</span>
                  </div>
                  <p className="mt-6 border-s-2 border-[#456553] ps-3 text-[12px] leading-[1.7] text-[#456553]">{c.note}</p>
                  <button onClick={place} disabled={blocked} className={`${primaryBtn} mt-6 w-full`}>{placing ? c.placing : c.place}</button>
                  <button onClick={() => { if (window.confirm(c.confirmClear)) void mutate("DELETE", "clear"); }} disabled={busy} className={`${ghostBtn} mt-3 w-full`}>{c.clear}</button>
                </aside>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
