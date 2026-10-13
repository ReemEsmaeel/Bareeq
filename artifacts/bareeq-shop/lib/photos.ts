import mongoose from "mongoose";
import { Photo } from "@/models/Photo";
import { Product } from "@/models/Product";
import { HttpError } from "./http";
import { photoUrl } from "./photo-storage";
import type { AdminPhoto } from "./types";

export function adminPhoto(photo: any, products: any[] = []): AdminPhoto {
  const url = photoUrl(String(photo._id));
  return {
    id: String(photo._id),
    url,
    name: photo.name,
    size: photo.size,
    contentType: photo.contentType,
    status: photo.status,
    createdAt: new Date(photo.createdAt).toISOString(),
    usedBy: products.filter((p) => p.image === url).map((p) => ({
      id: String(p._id), name: p.name, nameAr: p.nameAr,
    })),
  };
}

/** Managed photos can only be attached while ready. A transaction write prevents
 * deletion racing with product saves and leaving broken storefront image paths. */
export async function saveProductWithPhoto(data: Record<string, unknown>, id?: string) {
  const image = String(data.image);
  const mediaId = /^\/api\/shop\/media\/([a-f\d]{24})$/i.exec(image)?.[1];
  if (image.startsWith("/api/shop/media") && !mediaId) throw new HttpError(400, "Choose a valid uploaded product photo.");
  const session = await mongoose.startSession();
  let result: any;
  try {
    await session.withTransaction(async () => {
      if (mediaId) {
        const locked = await Photo.updateOne({ _id: mediaId, status: "ready" },
          { $inc: { attachmentVersion: 1 } }, { session });
        if (!locked.matchedCount) throw new HttpError(409, "This photo is no longer available. Choose another photo.");
      }
      if (id) {
        result = await Product.findByIdAndUpdate(id, { $set: data },
          { session, returnDocument: "after", runValidators: true });
        if (!result) throw new HttpError(404, "This piece was not found.");
      } else {
        [result] = await Product.create([data], { session });
      }
    });
    return result;
  } finally {
    await session.endSession();
  }
}
