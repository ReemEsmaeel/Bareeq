import mongoose, { Schema } from "mongoose";
import { ADMIN_PERMISSIONS } from "@/lib/permissions";

const schema = new Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  nameAr: { type: String, required: true, trim: true, maxlength: 80 },
  permissions: { type: [{ type: String, enum: ADMIN_PERMISSIONS }], required: true },
}, { timestamps: true });

export const Role = mongoose.models.ShopRole || mongoose.model("ShopRole", schema);
