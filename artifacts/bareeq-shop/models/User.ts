import mongoose, { Schema } from "mongoose";

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "ShopProduct", required: true },
    quantity: { type: Number, min: 1, max: 20, required: true },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    active: { type: Boolean, default: true },
    authVersion: { type: Number, default: 0 },
    cart: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

export const User =
  mongoose.models.ShopUser || mongoose.model("ShopUser", userSchema);
