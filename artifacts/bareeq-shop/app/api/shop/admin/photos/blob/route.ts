import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, handle, HttpError } from "@/lib/http";
import { MAX_PHOTO_BYTES, verifyPhotoUpload } from "@/lib/photo-storage";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    const admin = await requireAdmin("photos");
    await rateLimit(request, "photo-bytes", 60, 15, String(admin._id));
    const upload = await verifyPhotoUpload(request.nextUrl.searchParams.get("token") ?? "", String(admin._id));
    if (request.headers.get("content-type") !== upload.contentType) throw new HttpError(400, "The image type does not match.");
    const length = request.headers.get("content-length");
    if (length && Number(length) > MAX_PHOTO_BYTES) throw new HttpError(413, "Photos must be 4 MB or smaller.");
    if (!request.body) throw new HttpError(400, "Choose a photo to upload.");
    const reader = request.body.getReader();
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_PHOTO_BYTES || size > upload.size) {
          await reader.cancel();
          throw new HttpError(413, "The photo exceeds its declared size or the 4 MB limit.");
        }
        chunks.push(Buffer.from(chunk.value));
      }
    } finally { reader.releaseLock(); }
    if (size !== upload.size) throw new HttpError(400, "The uploaded photo size does not match.");
    await upload.file.save(Buffer.concat(chunks), { metadata: { contentType: upload.contentType } });
    return { success: true };
  });
}
