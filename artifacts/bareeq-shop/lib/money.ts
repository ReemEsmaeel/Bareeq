export const SHOP_CURRENCY = "KWD" as const;
export type MoneyCurrency = typeof SHOP_CURRENCY | "SAR";

export const STRIPE_CURRENCY: Record<MoneyCurrency, string> = {
  KWD: "kwd",
  SAR: "sar",
};

const MINOR_UNITS_PER_UNIT: Record<MoneyCurrency, number> = {
  KWD: 1_000,
  SAR: 100,
};

export function toMinorUnits(amount: number, currency: MoneyCurrency = SHOP_CURRENCY) {
  return Math.round(amount * MINOR_UNITS_PER_UNIT[currency]);
}
