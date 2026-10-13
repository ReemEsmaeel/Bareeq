import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, handle, HttpError, validId } from "@/lib/http";
import { adminPhoto } from "@/lib/photos";
import { imageType, MAX_PHOTO_BYTES, photoFile } from "@/lib/photo-storage";
import { Photo } from "@/models/Photo";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    checkOrigin(request);
    await requireAdmin();
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
        throw new HttpError(400, "The uploaded file size is invalid. Choose an image up to 5 MB.");
      }
      // Read the verified generation only; publish these exact bytes to a path
      // the client's signed PUT URL cannot overwrite.
      const [bytes] = await staged.download({ start: 0, end: MAX_PHOTO_BYTES });
      const actualType = imageType(bytes);
      if (bytes.length !== size || !actualType || actualType !== photo.contentType) {
        throw new HttpError(400, "This file is not a valid JPEG, PNG or WebP photo.");
      }
      await photoFile(id).save(bytes, {
        resumable: false,
        metadata: { contentType: actualType, cacheControl: "no-store" },
      });
      photo.status = "ready";
      await photo.save();
      // Failure to remove staging must not pretend publication failed.
      await staged.delete({ ignoreNotFound: true }).catch(() => {
        console.warn("[shop-photo] Staged upload cleanup deferred.");
      });
      return adminPhoto(photo);
    } catch (error) {
      await Photo.updateOne({ _id: id, status: "processing" }, { $set: { status: "pending" } });
      throw error;
    }
  });
}
