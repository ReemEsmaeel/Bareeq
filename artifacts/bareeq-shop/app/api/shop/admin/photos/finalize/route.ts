import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, handle } from "@/lib/http";
import { finalizePhoto } from "@/lib/photo-storage";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
const input = z.object({ ticket: z.string().min(1).max(2000) }).strict();

export async function POST(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    const user = await requireAdmin("photos");
    await rateLimit(request, "photo-finalize", 60, 10, String(user._id));
    return finalizePhoto(String(user._id), input.parse(await request.json()).ticket);
  }, 201);
}
