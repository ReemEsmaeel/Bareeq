import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  _id: { type: String, required: true },
  completedAt: { type: Date, required: true },
});

export const Bootstrap = mongoose.models.ShopBootstrap || mongoose.model("ShopBootstrap", schema);
