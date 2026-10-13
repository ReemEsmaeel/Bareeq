import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  _id: { type: String, required: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const RateLimit = mongoose.models.ShopRateLimit || mongoose.model("ShopRateLimit", schema);
