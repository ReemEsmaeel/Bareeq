import Stripe from "stripe";
import type { NextRequest } from "next/server";
import { HttpError } from "./http";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || (!key.startsWith("sk_test_") && !key.startsWith("rk_test_"))) {
    throw new HttpError(503, "Stripe test payments are not configured. The shop needs a valid test secret key in this deployment.");
  }
  return new Stripe(key, { timeout: 15_000, maxNetworkRetries: 2 });
}

export function webhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.startsWith("whsec_")) {
    throw new HttpError(503, "Stripe payment verification is not configured. The shop needs STRIPE_WEBHOOK_SECRET in this deployment.");
  }
  return secret;
}

export function checkoutOrigin(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  if (process.env.NODE_ENV !== "production") {
    const allowed = new Set(["http://localhost", "http://localhost:23542",
      ...(process.env.REPLIT_DEV_DOMAIN ? [`https://${process.env.REPLIT_DEV_DOMAIN}`] : [])]);
    if (allowed.has(origin)) return origin;
  }
  try {
    const configured = new URL(process.env.SHOP_PUBLIC_URL ?? "");
    if (configured.protocol !== "https:" || configured.username || configured.password ||
        configured.pathname !== "/" || configured.search || configured.hash) throw new Error();
    if (origin !== configured.origin) throw new HttpError(403, "Open checkout from the shop's main website.");
    return configured.origin;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "Set SHOP_PUBLIC_URL to this deployment's public HTTPS website address before enabling checkout.");
  }
}
