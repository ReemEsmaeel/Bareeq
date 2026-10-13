import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  name: { type: String, required: true, maxlength: 150 },
  size: { type: Number, required: true },
  contentType: { type: String, enum: ["image/jpeg", "image/png", "image/webp"], required: true },
  status: { type: String, enum: ["pending", "processing", "ready", "deleting"], default: "pending", index: true },
  expiresAt: { type: Date, required: true },
  // Writes to this record serialize attachment against deletion.
  attachmentVersion: { type: Number, default: 0 },
}, { timestamps: true });

export const Photo = mongoose.models.ShopPhoto || mongoose.model("ShopPhoto", schema);
