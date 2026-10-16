import type Stripe from "stripe";
import { connectDB } from "./db";
import { HttpError } from "./http";
import { Order } from "../models/Order";

export const STRIPE_SHOP = "bareeq_independent_shop";

/** Only call with a session retrieved from Stripe or a signature-verified event. */
export async function recordVerifiedPayment(session: Stripe.Checkout.Session) {
  if (session.metadata?.shop !== STRIPE_SHOP) return null;
  const id = session.metadata?.orderId;
  if (!id || !/^[a-f\d]{24}$/i.test(id) || session.livemode || session.mode !== "payment") {
    throw new HttpError(400, "The payment does not match a shop test order.");
  }
  await connectDB();
  const order = await Order.findById(id);
  if (!order || order.paymentProvider !== "stripe" || order.stripeSessionId !== session.id) {
    // Retryable: a webhook may arrive before session creation has been saved.
    throw new HttpError(503, "The order is not ready for payment confirmation. Please retry.");
  }
  if (session.client_reference_id !== String(order.user) || session.currency !== "sar" ||
      session.amount_total !== Math.round(order.total * 100)) {
    throw new HttpError(400, "The payment amount or account does not match the order.");
  }
  if (session.payment_status === "paid" && session.status === "complete") {
    await Order.updateOne({ _id: id, stripeSessionId: session.id, status: "pending" }, {
      $set: {
        status: "paid", paidAt: new Date(),
        ...(typeof session.payment_intent === "string" ? { stripePaymentIntentId: session.payment_intent } : {}),
      },
    });
    return { orderId: id, status: "paid" as const, sessionState: session.status };
  }
  return { orderId: id, status: order.status as "pending" | "paid", sessionState: session.status };
}
