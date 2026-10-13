"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageIntro, ProductCard, ProductGridSkeleton, StateBlock, ghostBtn } from "@/components/shop-ui";
import { useShop } from "@/components/shop-provider";
import { ApiError, api } from "@/lib/client";
import { CATEGORIES, CATEGORY_AR, type Category } from "@/lib/format";
import type { ShopProduct } from "@/lib/types";

const t = {
  en: { kicker: "The collections", title: "Every piece, in one light.", all: "All", search: "Search by name", results: (n: number) => `${n} ${n === 1 ? "piece" : "pieces"}`, emptyT: "Nothing here yet.", emptyX: "No pieces match this view. Try another collection or a different name.", clear: "Clear filters", errT: "The collection could not load.", retry: "Try again", filter: "Filter by collection" },
  ar: { kicker: "المجموعات", title: "كل القطع، في ضوء واحد.", all: "الكل", search: "ابحثي بالاسم", results: (n: number) => `${n} قطعة`, emptyT: "لا شيء هنا بعد.", emptyX: "لا توجد قطع تطابق هذا العرض. جرّبي مجموعة أخرى أو اسماً مختلفاً.", clear: "مسح الفلاتر", errT: "تعذّر تحميل المجموعة.", retry: "حاولي مجدداً", filter: "تصفية حسب المجموعة" },
};

export function Catalog() {
  const { language } = useShop();
  const c = t[language];
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("category");
  const category = (CATEGORIES as readonly string[]).includes(raw ?? "") ? (raw as Category) : null;
  const [products, setProducts] = useState<ShopProduct[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setProducts(null);
    setError("");
    api<ShopProduct[]>(`/products${category ? `?category=${category}` : ""}`)
      .then((data) => live && setProducts(data))
      .catch((err) => live && setError(err instanceof ApiError ? err.message : c.errT));
    return () => { live = false; };
  }, [category, attempt, c.errT]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!products || !q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.nameAr.includes(query.trim()));
  }, [products, query]);

  function choose(next: Category | null) {
    router.replace(next ? `${pathname}?category=${next}` : pathname, { scroll: false });
  }

  const chip = (active: boolean) => `whitespace-nowrap border px-4 py-2.5 text-[11px] font-semibold tracking-[.08em] transition-colors ${active ? "border-[#2a0006] bg-[#2a0006] text-[#f6fbf5]" : "border-[#2a0006]/20 text-[#2a0006] hover:border-[#2a0006]"}`;

  return (
    <main className="page-grain mx-auto max-w-[1240px] px-5 pb-24 pt-12 sm:px-9 lg:pt-20">
      <PageIntro kicker={c.kicker} title={category ? (language === "ar" ? CATEGORY_AR[category] : category) : c.title} />
      <div className="sticky top-0 z-10 -mx-5 mt-10 flex flex-col gap-4 border-y border-[#2a0006]/10 bg-[#f6fbf5]/95 px-5 py-4 backdrop-blur sm:-mx-9 sm:px-9 md:flex-row md:items-center md:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1" role="group" aria-label={c.filter}>
          <button aria-pressed={!category} onClick={() => choose(null)} className={chip(!category)}>{c.all}</button>
          {CATEGORIES.map((cat) => (
            <button key={cat} aria-pressed={category === cat} onClick={() => choose(cat)} className={chip(category === cat)}>
              {language === "ar" ? CATEGORY_AR[cat] : cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="catalog-search" className="sr-only">{c.search}</label>
          <input id="catalog-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={c.search} className="w-full border-0 border-b border-[#2a0006]/25 bg-transparent py-2 text-[14px] text-[#2a0006] outline-none placeholder:text-[#796d68]/70 focus:border-[#456553] md:w-60" />
          {visible && <span className="shrink-0 text-[11px] text-[#796d68]" aria-live="polite">{c.results(visible.length)}</span>}
        </div>
      </div>
      <div className="mt-10">
        {error ? (
          <StateBlock tone="error" title={c.errT} text={error} action={<button className={ghostBtn} onClick={() => setAttempt((n) => n + 1)}>{c.retry}</button>} />
        ) : !visible ? (
          <ProductGridSkeleton />
        ) : visible.length === 0 ? (
          <StateBlock title={c.emptyT} text={c.emptyX} action={(category || query) ? <button className={ghostBtn} onClick={() => { setQuery(""); choose(null); }}>{c.clear}</button> : undefined} />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6">
            {visible.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </main>
  );
}
