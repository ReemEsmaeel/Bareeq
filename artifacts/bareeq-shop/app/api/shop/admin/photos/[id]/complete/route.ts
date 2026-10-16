import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, handle, HttpError, validId } from "@/lib/http";
import { adminPhoto } from "@/lib/photos";
import { imageType, MAX_LIBRARY_PHOTO_BYTES as MAX_PHOTO_BYTES, photoFile, photoStorageClient, validatePhoto } from "@/lib/photo-storage";
import { Photo } from "@/models/Photo";
import mongoose from "mongoose";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    checkOrigin(request);
    await requireAdmin("photos");
    z.object({}).strict().parse(await request.json());
    const { id } = await context.params;
    validId(id);
    const existing = await Photo.findById(id);
    if (!existing) throw new HttpError(404, "This upload was not found.");
    if (existing.status === "ready") return adminPhoto(existing);
    const photo = await Photo.findOneAndUpdate(
      { _id: id, status: "pending", expiresAt: { $gt: new Date() } },
      { $set: { status: "processing" } }, { returnDocument: "after" },
    );
    if (!photo) throw new HttpError(409, "This upload has expired or is already being processed. Try uploading again.");
    const staged = photoFile(id, true);
    try {
      const [exists] = await staged.exists();
      if (!exists) throw new HttpError(400, "Upload the image before saving it.");
      const [metadata] = await staged.getMetadata();
      const size = Number(metadata.size);
      if (!Number.isSafeInteger(size) || size < 1 || size > MAX_PHOTO_BYTES || size !== photo.size) {
        throw new HttpError(400, "The uploaded file size is invalid. Choose an image up to 4 MB.");
      }
      // Read the verified generation only; publish these exact bytes to a path
      // the client's signed PUT URL cannot overwrite.
      const snapshot = photoStorageClient.bucket(staged.bucket.name).file(staged.name, { generation: metadata.generation });
      const [bytes] = await snapshot.download({ start: 0, end: MAX_PHOTO_BYTES });
      const actualType = imageType(bytes);
      if (bytes.length !== size || !actualType || actualType !== photo.contentType) {
        throw new HttpError(400, "This file is not a valid JPEG, PNG or WebP photo.");
      }
      // Library uploads must pass full decoding too, not only signature checks.
      const safePhoto = await validatePhoto(bytes, actualType);
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await photoFile(id).save(safePhoto, {
            session,
            metadata: { contentType: "image/webp", cacheControl: "no-store", metadata: { validated: "true" } },
          });
          const result = await Photo.updateOne({ _id: id, status: "processing" },
            { $set: { status: "ready", contentType: "image/webp", size: safePhoto.length } }, { session });
          if (!result.matchedCount) throw new HttpError(409, "This upload is no longer available.");
        });
      } finally { await session.endSession(); }
      photo.status = "ready";
      photo.contentType = "image/webp";
      photo.size = safePhoto.length;
      // Failure to remove staging must not pretend publication failed.
      await snapshot.delete({ ignoreNotFound: true }).catch(() => {
        console.warn("[shop-photo] Staged upload cleanup deferred.");
      });
      return adminPhoto(photo);
    } catch (error) {
      await Photo.updateOne({ _id: id, status: "processing" }, { $set: { status: "pending" } });
      throw error;
    }
  });
}
