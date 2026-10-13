import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, handle, HttpError, validId } from "@/lib/http";
import { DEFAULT_PRODUCT_IMAGE, photoFile, photoUrl } from "@/lib/photo-storage";
import { Photo } from "@/models/Photo";
import { Product } from "@/models/Product";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    checkOrigin(request);
    await requireAdmin("photos");
    const { id } = await context.params;
    validId(id);
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const photo = await Photo.findOneAndUpdate(
          { _id: id, status: { $ne: "processing" } },
          { $set: { status: "deleting" }, $inc: { attachmentVersion: 1 } },
          { session, returnDocument: "after" },
        );
        if (!photo) {
          if (await Photo.exists({ _id: id }).session(session)) {
            throw new HttpError(409, "This upload is still processing. Try removing it again shortly.");
          }
          throw new HttpError(404, "This photo was not found.");
        }
        await Product.updateMany({ image: photoUrl(id) },
          { $set: { image: DEFAULT_PRODUCT_IMAGE } }, { session });
      });
    } finally {
      await session.endSession();
    }
    try {
      await Promise.all([
        photoFile(id).delete({ ignoreNotFound: true }),
        photoFile(id, true).delete({ ignoreNotFound: true }),
      ]);
    } catch {
      throw new HttpError(503, "The photo is hidden, but storage removal could not finish. Retry deletion to finish removing the file.");
    }
    await Photo.deleteOne({ _id: id, status: "deleting" });
    return { success: true };
  });
}
