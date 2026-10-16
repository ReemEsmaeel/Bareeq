import mongoose, { Schema } from "mongoose";

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    nameAr: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, maxlength: 3000 },
    descriptionAr: { type: String, required: true, maxlength: 3000 },
    price: { type: Number, required: true, min: 0.001 },
    image: { type: String, required: true },
    category: { type: String, enum: ["Lujain", "Rawnaq", "Wahaj"], required: true },
  },
  { timestamps: true },
);

export const Product =
  mongoose.models.ShopProduct || mongoose.model("ShopProduct", productSchema);
