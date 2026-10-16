import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { checkOrigin, handle, HttpError } from "@/lib/http";
import { getStripe } from "@/lib/stripe";
import { recordVerifiedPayment } from "@/lib/stripe-payment";
import { Order } from "@/models/Order";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const { sessionId } = z.object({ sessionId: z.string().regex(/^cs_test_[a-zA-Z0-9_]+$/).max(300) }).strict().parse(await request.json());
    await rateLimit(request, "stripe-confirm", 60, 10, String(user._id));
    // Check ownership before retrieving anything from Stripe.
    if (!(await Order.exists({ user: user._id, stripeSessionId: sessionId, paymentProvider: "stripe" }))) {
      throw new HttpError(404, "This payment was not found.");
    }
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const result = await recordVerifiedPayment(session);
    if (!result) throw new HttpError(400, "This payment does not belong to the shop.");
    return result;
  });
}
