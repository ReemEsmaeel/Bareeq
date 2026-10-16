import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "ShopUser", required: true, index: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "ShopProduct", required: true },
        name: { type: String, required: true },
        nameAr: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
      },
    ],
    total: { type: Number, required: true },
    // Legacy orders default to SAR; new shop orders set KWD explicitly.
    currency: { type: String, enum: ["SAR", "KWD"], default: "SAR" },
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
    paymentProvider: { type: String, enum: ["manual", "stripe"], default: "manual" },
    checkoutAttempt: { type: Number, default: 0 },
    checkoutOrigin: { type: String },
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true },
);
orderSchema.index({ stripeSessionId: 1 }, { unique: true, sparse: true });

export const Order =
  mongoose.models.ShopOrder || mongoose.model("ShopOrder", orderSchema);
