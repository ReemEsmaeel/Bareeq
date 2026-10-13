import mongoose, { Schema } from "mongoose";

// Serializes changes to the permission graph and active full administrators.
const schema = new Schema({
  _id: { type: String, required: true },
  revision: { type: Number, default: 0 },
});

export const AdminControl = mongoose.models.ShopAdminControl || mongoose.model("ShopAdminControl", schema);
