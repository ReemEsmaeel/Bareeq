import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, handle } from "@/lib/http";
import { MAX_PHOTO_BYTES, photoUploadUrl } from "@/lib/photo-storage";
import { rateLimit } from "@/lib/rate-limit";
import { Photo } from "@/models/Photo";

const input = z.object({
  name: z.string().trim().min(1).max(150),
  size: z.number().int().min(1).max(MAX_PHOTO_BYTES, "Photo must be 5 MB or smaller."),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"], { message: "Choose a JPEG, PNG or WebP image." }),
}).strict();

export async function POST(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    const admin = await requireAdmin("photos");
    const data = input.parse(await request.json());
    await rateLimit(request, "photo-upload", 30, 15, String(admin._id));
    const photo = await Photo.create({ ...data, expiresAt: new Date(Date.now() + 15 * 60000) });
    try {
      return { id: String(photo._id), uploadURL: await photoUploadUrl(String(photo._id)) };
    } catch (error) {
      await Photo.deleteOne({ _id: photo._id, status: "pending" });
      throw error;
    }
  }, 201);
}
