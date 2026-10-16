import { SHOP_CURRENCY, type MoneyCurrency } from "./money";

export function formatPrice(value: number, language: "en" | "ar", currency: MoneyCurrency = SHOP_CURRENCY) {
  return new Intl.NumberFormat(language === "ar" ? "ar-KW" : "en-KW", {
    style: "currency",
    currency,
  }).format(value);
}

export function formatDate(value: string, language: "en" | "ar") {
  return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(value));
}

export const CATEGORIES = ["Lujain", "Rawnaq", "Wahaj"] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_AR: Record<Category, string> = { Lujain: "لُجين", Rawnaq: "رَوْنَق", Wahaj: "وَهَج" };

export function normalizeOrderQuery(value: string) {
  return value.trim().replace(/^#/, "").toLowerCase();
}
