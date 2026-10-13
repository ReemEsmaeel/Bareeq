import type { NextRequest } from "next/server";
import { clearSession } from "@/lib/auth";
import { checkOrigin, handle } from "@/lib/http";

export async function POST(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    await clearSession();
    return { success: true };
  });
}
