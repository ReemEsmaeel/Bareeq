import type { ShopProduct } from "./types";

type ValueData = { quantity: number; value_sar: number };
type EventData = {
  account_created: undefined;
  add_to_bag: ValueData & { collection: ShopProduct["category"] };
  order_recorded: ValueData;
};
type AnalyticsData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): void | Promise<unknown>;
    };
  }
}

// Outcomes only: no page-load replay, identifiers, user content, or payment claims.
export function trackEvent<T extends keyof EventData>(name: T, data: EventData[T]): void {
  if (typeof window === "undefined") return;
  try {
    let safeData: AnalyticsData | undefined;
    if (name !== "account_created") {
      if (!data || !Number.isInteger(data.quantity) || data.quantity < 1
        || !Number.isFinite(data.value_sar) || data.value_sar < 0) return;
      safeData = { quantity: data.quantity, value_sar: data.value_sar };
      if (name === "add_to_bag") {
        const collection = (data as EventData["add_to_bag"]).collection;
        if (!["Lujain", "Rawnaq", "Wahaj"].includes(collection)) return;
        safeData.collection = collection;
      } else if (name !== "order_recorded") return;
    }
    // Never await analytics or retry: missing/blocked trackers must not affect shopping.
    void Promise.resolve(window.umami?.track(name, safeData)).catch(() => {});
  } catch {
    // Includes synchronous tracker failures and unavailable tracker properties.
  }
}
