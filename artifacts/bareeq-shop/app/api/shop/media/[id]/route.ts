import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { handle, HttpError, validId } from "@/lib/http";
import { photoFile } from "@/lib/photo-storage";
import { Photo } from "@/models/Photo";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    validId(id);
    await connectDB();
    const photo = await Photo.findOne({ _id: id, status: "ready" }).lean() as any;
    if (!photo) throw new HttpError(404, "This photo was not found.");
    const file = photoFile(id);
    const [metadata] = await file.getMetadata();
    const [bytes] = await file.download();
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": metadata.contentType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handle(async () => { throw error; });
  }
}
