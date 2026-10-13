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
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
  },
  { timestamps: true },
);

export const Order =
  mongoose.models.ShopOrder || mongoose.model("ShopOrder", orderSchema);
