import mongoose, { Schema } from "mongoose";

// Separate binary documents keep bytes out of product/photo list responses.
const schema = new Schema({
  _id: { type: String, required: true },
  bytes: { type: Buffer, required: true, select: false },
  generation: { type: String, required: true },
  size: { type: Number, required: true },
  contentType: { type: String, required: true },
  cacheControl: { type: String, default: "no-store" },
  validated: { type: Boolean, default: false },
  // Only staging objects expire; published photos never have this field.
  expiresAt: { type: Date },
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PhotoBlob = mongoose.models.ShopPhotoBlob || mongoose.model("ShopPhotoBlob", schema);
