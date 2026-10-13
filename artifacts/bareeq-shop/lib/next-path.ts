const ALLOWED = ["/products", "/account", "/cart", "/orders", "/admin"];

export function safeNext(value: string | null | undefined, fallback: "/products" | "/account" = "/products"): string {
  if (!value || typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  const path = value.split(/[?#]/)[0];
  return ALLOWED.some((base) => path === base || path.startsWith(`${base}/`)) ? value : fallback;
}
