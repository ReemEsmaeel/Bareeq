"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { ShopProduct } from "@/lib/types";
import { ProductCard, ProductGridSkeleton } from "./shop-ui";
import { useShop } from "./shop-provider";

const t = {
  en: { kicker: "03 — FROM THE ATELIER", title: "Recently finished.", all: "View every piece", empty: "New pieces are being finished. Please return soon.", error: "These pieces could not load right now." },
  ar: { kicker: "٠٣ — من الأتيليه", title: "أُنجزت حديثاً.", all: "عرض كل القطع", empty: "قطع جديدة قيد الإنجاز. عودي قريباً.", error: "تعذّر تحميل هذه القطع الآن." },
};

export function FeaturedProducts() {
  const { language } = useShop();
  const c = t[language];
  const [products, setProducts] = useState<ShopProduct[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    api<ShopProduct[]>("/products").then((p) => live && setProducts(p.slice(0, 3))).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, []);

  return (
    <section id="featured" className="bg-[#f0f5f0] px-5 py-[78px] sm:px-9 sm:py-24 lg:px-[10%] lg:py-[120px]">
      <div className="mx-auto max-w-[1160px]">
        <div className="mb-11 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow text-[#456553]">{c.kicker}</p>
            <h2 className={`mt-4 font-display text-[clamp(2.5rem,5vw,4.3rem)] leading-[1.04] tracking-[-.045em] text-[#2a0006] ${language === "ar" ? "font-arabic !leading-[1.3] tracking-normal" : ""}`}>{c.title}</h2>
          </div>
          <Link href="/products" className="eyebrow border-b border-[#2a0006]/30 pb-1.5 text-[#2a0006] hover:text-[#456553]">{c.all}</Link>
        </div>
        {failed ? <p className="text-[13px] text-[#796d68]">{c.error}</p>
          : !products ? <ProductGridSkeleton count={3} />
          : products.length === 0 ? <p className="text-[13px] text-[#796d68]">{c.empty}</p>
          : <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
      </div>
    </section>
  );
}
