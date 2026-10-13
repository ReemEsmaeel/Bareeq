const ALLOWED = ["/account", "/cart", "/orders", "/admin"];

export function safeNext(value: string | null | undefined): string {
  if (!value || typeof value !== "string") return "/account";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/account";
  const path = value.split(/[?#]/)[0];
  return ALLOWED.some((base) => path === base || path.startsWith(`${base}/`)) ? value : "/account";
}
