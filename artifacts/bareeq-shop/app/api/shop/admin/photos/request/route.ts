import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, handle } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { photoRequestInput, requestPhotoUpload } from "@/lib/photo-storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    const user = await requireAdmin("photos");
    await rateLimit(request, "photo-upload", 30, 10, String(user._id));
    return requestPhotoUpload(String(user._id), photoRequestInput.parse(await request.json()));
  });
}
