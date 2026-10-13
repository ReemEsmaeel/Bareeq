import { NextResponse } from "next/server";
import { HttpError } from "@/lib/http";
import { servePhoto } from "@/lib/photo-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await servePhoto((await context.params).id);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 503;
    return NextResponse.json({ error: status === 404 ? "Photo not found." : "Photo storage is temporarily unavailable." }, { status });
  }
}
