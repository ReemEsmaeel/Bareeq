import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { checkOrigin, handle } from "@/lib/http";
import { checkoutOrigin } from "@/lib/stripe";
import { createOrderCheckout } from "@/lib/stripe-checkout";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const { orderId } = z.object({ orderId: z.string().regex(/^[a-f\d]{24}$/i) }).strict().parse(await request.json());
    await rateLimit(request, "stripe-checkout", 20, 10, String(user._id));
    return createOrderCheckout(orderId, String(user._id), checkoutOrigin(request));
  });
}
