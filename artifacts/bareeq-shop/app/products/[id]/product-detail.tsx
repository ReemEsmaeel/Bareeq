"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductImage, QuantityStepper, StateBlock, ghostBtn, primaryBtn } from "@/components/shop-ui";
import { useShop } from "@/components/shop-provider";
import { ApiError, api } from "@/lib/client";
import { trackEvent } from "@/lib/analytics";
import { CATEGORY_AR, formatPrice } from "@/lib/format";
import type { ShopCart, ShopProduct } from "@/lib/types";

const t = {
  en: { back: "All pieces", qty: "Quantity", add: "Add to bag", adding: "Adding", added: "Added to your bag.", view: "View bag", guest: "Sign in to add", missT: "This piece is not available.", missX: "It may have been removed from the collection.", errT: "This piece could not load.", retry: "Try again", sterling: "925 sterling silver · Finished by hand" },
  ar: { back: "كل القطع", qty: "الكمية", add: "أضيفي إلى الحقيبة", adding: "جارٍ الإضافة", added: "أُضيفت إلى حقيبتكِ.", view: "عرض الحقيبة", guest: "سجّلي الدخول للإضافة", missT: "هذه القطعة غير متاحة.", missX: "ربما أُزيلت من المجموعة.", errT: "تعذّر تحميل هذه القطعة.", retry: "حاولي مجدداً", sterling: "فضة إسترلينية ٩٢٥ · لمسات يدوية" },
};

export function ProductDetail({ id }: { id: string }) {
  const { language, user, authLoading } = useShop();
  const c = t[language];
  const ar = language === "ar";
  const router = useRouter();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    setState("loading");
    api<ShopProduct>(`/products/${encodeURIComponent(id)}`)
      .then((p) => { if (live) { setProduct(p); setState("ready"); } })
      .catch((err) => {
        if (!live) return;
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) setState("missing");
        else { setError(err instanceof ApiError ? err.message : ""); setState("error"); }
      });
    return () => { live = false; };
  }, [id, attempt]);

  async function add() {
    if (!product) return;
    if (!user) { router.push("/login?next=/cart"); return; }
    setBusy(true);
    setNotice(null);
    try {
      const cart = await api<ShopCart>("/cart", { method: "POST", body: { productId: product.id, quantity } });
      const added = cart.items.find((item) => item.product.id === product.id);
      if (added) trackEvent("add_to_bag", {
        collection: added.product.category,
        quantity,
        value_sar: Math.round(added.product.price * quantity * 100) / 100,
      });
      setNotice({ ok: true, text: c.added });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { router.push("/login?next=/cart"); return; }
      setNotice({ ok: false, text: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-grain mx-auto max-w-[1240px] px-5 pb-24 pt-8 sm:px-9 lg:pt-12">
      <Link href="/products" className="eyebrow inline-flex items-center gap-2 text-[#796d68] hover:text-[#2a0006]"><span aria-hidden="true">{ar ? "→" : "←"}</span>{c.back}</Link>
      <div className="mt-8">
        {state === "loading" && (
          <div className="grid gap-10 lg:grid-cols-2" aria-hidden="true">
            <div className="aspect-[.9] animate-pulse bg-[#2a0006]/[.06]" />
            <div className="space-y-4 pt-6"><div className="h-3 w-24 animate-pulse bg-[#2a0006]/[.06]" /><div className="h-12 w-3/4 animate-pulse bg-[#2a0006]/[.06]" /><div className="h-24 animate-pulse bg-[#2a0006]/[.06]" /></div>
          </div>
        )}
        {state === "missing" && <StateBlock title={c.missT} text={c.missX} action={<Link href="/products" className={ghostBtn}>{c.back}</Link>} />}
        {state === "error" && <StateBlock tone="error" title={c.errT} text={error} action={<button className={ghostBtn} onClick={() => setAttempt((n) => n + 1)}>{c.retry}</button>} />}
        {state === "ready" && product && (
          <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:gap-16">
            <ProductImage product={product} className="reveal aspect-[.9]" />
            <div className="reveal reveal-delay-1 lg:pt-8">
              <Link href={`/products?category=${product.category}`} className="eyebrow text-[#456553] hover:underline">{ar ? CATEGORY_AR[product.category] : product.category}</Link>
              <h1 className={`mt-4 text-[#2a0006] ${ar ? "font-arabic text-[clamp(2.4rem,5vw,3.6rem)] leading-[1.3]" : "font-display text-[clamp(2.4rem,5vw,4rem)] leading-[1.04] tracking-[-.04em]"}`}>{ar ? product.nameAr : product.name}</h1>
              <p className={`mt-1 text-[#796d68] ${ar ? "font-display text-lg" : "font-arabic text-xl"}`}>{ar ? product.name : product.nameAr}</p>
              <p className="mt-6 text-[22px] font-semibold tabular-nums text-[#2a0006]">{formatPrice(product.price, language)}</p>
              <p className={`mt-6 max-w-[460px] whitespace-pre-line leading-[1.95] text-[#675d59] ${ar ? "font-arabic text-[18px]" : "text-[14px]"}`}>{ar ? product.descriptionAr : product.description}</p>
              <p className="eyebrow mt-8 border-t border-[#2a0006]/10 pt-6 !text-[9px] text-[#456553]">{c.sterling}</p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <QuantityStepper value={quantity} onChange={setQuantity} disabled={busy} label={c.qty} />
                <button onClick={add} disabled={busy || authLoading} className={`${primaryBtn} flex-1`}>{busy ? c.adding : user || authLoading ? c.add : c.guest}</button>
              </div>
              {notice && (
                <p role={notice.ok ? "status" : "alert"} className={`mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-s-2 px-4 py-3 text-[13px] ${notice.ok ? "border-[#456553] bg-[#456553]/10 text-[#456553]" : "border-[#4a0e17] bg-[#4a0e17]/5 text-[#4a0e17]"}`}>
                  {notice.text}{notice.ok && <Link href="/cart" className="font-semibold underline underline-offset-4">{c.view}</Link>}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
