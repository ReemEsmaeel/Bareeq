import { NextResponse } from "next/server";
import { getStripe, webhookSecret } from "@/lib/stripe";
import { recordVerifiedPayment, recordVerifiedPaymentFailure } from "@/lib/stripe-payment";
import { HttpError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  let stripe, secret;
  try { stripe = getStripe(); secret = webhookSecret(); }
  catch { return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 }); }
  // Stripe signatures must be checked against the original, unparsed bytes.
  let event;
  try {
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > 1_000_000) throw new Error();
    const bytes = Buffer.from(await request.arrayBuffer());
    if (bytes.length > 1_000_000) throw new Error();
    event = stripe.webhooks.constructEvent(bytes, signature, secret);
  } catch { return NextResponse.json({ error: "Invalid Stripe signature or payload." }, { status: 400 }); }
  if (event.livemode) return NextResponse.json({ error: "Only test-mode events are accepted." }, { status: 400 });
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await recordVerifiedPayment(event.data.object);
    } else if (event.type === "checkout.session.async_payment_failed") {
      await recordVerifiedPaymentFailure(event.data.object);
    }
    // Failed, expired, unrelated and duplicate events never mark an order paid.
    return NextResponse.json({ received: true });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 503;
    return NextResponse.json({ error: status === 400 ? "Payment did not match the order." : "Payment update is temporarily unavailable. Retry this event." }, { status });
  }
}
