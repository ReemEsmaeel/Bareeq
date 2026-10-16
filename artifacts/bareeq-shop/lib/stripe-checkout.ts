import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { HttpError } from "./http";
import { getStripe, webhookSecret } from "./stripe";
import { STRIPE_SHOP, recordVerifiedPayment } from "./stripe-payment";
import { Order } from "../models/Order";

async function stripePrice(stripe: Stripe, item: any) {
  const amount = Math.round(item.price * 100);
  if (!Number.isSafeInteger(amount) || amount < 1 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
    throw new HttpError(400, "This order has an invalid price or quantity.");
  }
  const name = String(item.name).slice(0, 250);
  const fingerprint = createHash("sha256").update(`${item.product}:${amount}:${name}`).digest("hex");
  const lookup = `bareeq_test_${fingerprint}`;
  const existing = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
  if (existing.data[0]) return existing.data[0].id;
  const product = await stripe.products.create({
    name, metadata: { shop: STRIPE_SHOP, productId: String(item.product) },
  }, { idempotencyKey: `bareeq-product-${fingerprint}` });
  const price = await stripe.prices.create({
    product: product.id, currency: "sar", unit_amount: amount, lookup_key: lookup,
    metadata: { shop: STRIPE_SHOP },
  }, { idempotencyKey: `bareeq-price-${fingerprint}` });
  return price.id;
}

/** An order snapshot, not browser-submitted amounts, determines the charge. */
export async function createOrderCheckout(orderId: string, userId: string, origin: string) {
  const stripe = getStripe();
  // Do not offer payment until durable webhook verification is configured too.
  webhookSecret();
  for (let retry = 0; retry < 4; retry++) {
    let order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) throw new HttpError(404, "This order was not found.");
    if (order.status === "paid") throw new HttpError(409, "This order is already paid.");
    if (!order.items.length || order.items.length > 40 ||
        !Number.isSafeInteger(Math.round(order.total * 100)) || order.total <= 0 ||
        Math.round(order.total * 100) > 99_999_999 ||
        order.items.reduce((sum: number, item: any) => sum + Math.round(item.price * 100) * item.quantity, 0) !== Math.round(order.total * 100)) {
      throw new HttpError(400, "This order total cannot be processed. Please contact the atelier.");
    }
    if (!order.checkoutOrigin || order.paymentProvider !== "stripe") {
      const updated = await Order.findOneAndUpdate({
        _id: orderId, user: userId, status: "pending",
        stripeSessionId: { $exists: false },
        $or: [{ checkoutOrigin: { $exists: false } }, { paymentProvider: { $ne: "stripe" } }],
      }, { $set: { checkoutOrigin: origin, paymentProvider: "stripe", checkoutAttempt: order.checkoutAttempt ?? 0 } },
      { returnDocument: "after" });
      if (!updated) continue;
      order = updated;
    }
    if (order.stripeSessionId) {
      const current = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      if (current.livemode) throw new HttpError(400, "Only test payments are enabled.");
      if (current.payment_status === "paid") {
        await recordVerifiedPayment(current);
        throw new HttpError(409, "This order is already paid. Refresh your orders.");
      }
      if (current.status === "open" && current.url) return { url: current.url, orderId };
      if (current.status !== "expired") throw new HttpError(409, "Stripe is confirming this payment. Check your order shortly; do not pay again.");
      const changed = await Order.updateOne({
        _id: orderId, status: "pending", stripeSessionId: current.id,
      }, {
        $inc: { checkoutAttempt: 1 },
        $unset: { stripeSessionId: "" },
        $set: { checkoutOrigin: origin },
      });
      if (!changed.modifiedCount) continue;
      continue;
    }
    const prices = await Promise.all(order.items.map((item: any) => stripePrice(stripe, item)));
    const attempt = order.checkoutAttempt ?? 0;
    const session = await stripe.checkout.sessions.create({
      mode: "payment", locale: "auto",
      client_reference_id: userId,
      metadata: { shop: STRIPE_SHOP, orderId, attempt: String(attempt) },
      payment_intent_data: { metadata: { shop: STRIPE_SHOP, orderId } },
      line_items: order.items.map((item: any, index: number) => ({ price: prices[index], quantity: item.quantity })),
      success_url: `${order.checkoutOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${order.checkoutOrigin}/checkout/cancel?order=${orderId}`,
    }, { idempotencyKey: `bareeq-checkout-${orderId}-${attempt}` });
    if (session.livemode || !session.url) throw new HttpError(502, "Stripe could not start a test checkout.");
    const saved = await Order.updateOne({
      _id: orderId, user: userId, status: "pending", paymentProvider: "stripe",
      checkoutAttempt: attempt, stripeSessionId: { $exists: false },
    }, { $set: { stripeSessionId: session.id } });
    if (!saved.modifiedCount) {
      const winner = await Order.findOne({ _id: orderId, user: userId });
      if (winner?.stripeSessionId !== session.id || winner.status === "paid") {
        throw new HttpError(409, "The order changed. Refresh it before continuing.");
      }
    }
    return { url: session.url, orderId };
  }
  throw new HttpError(409, "Checkout is already being prepared. Please try again shortly.");
}
