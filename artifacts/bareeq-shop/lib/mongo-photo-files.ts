import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { connectDB } from "./db";
import { HttpError } from "./http";
import { PhotoBlob } from "../models/PhotoBlob";
import type { ClientSession } from "mongoose";

type SaveOptions = {
  resumable?: boolean;
  preconditionOpts?: { ifGenerationMatch: number };
  metadata?: { contentType?: string; cacheControl?: string; metadata?: { validated?: string } };
  session?: ClientSession;
};

/** Small MongoDB binary files; the interface also pins reads to a generation. */
export class MongoPhotoFile {
  readonly bucket = { name: "shop" };
  constructor(readonly name: string, private generation?: string) {
    if (!/^(bareeq-independent-shop|independent-shop)\/(staging|photos)\/[a-f\d-]+$/i.test(name)) {
      throw new HttpError(400, "Invalid photo location.");
    }
  }
  private filter() {
    return {
      _id: this.name,
      ...(this.generation ? { generation: this.generation } : {}),
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
    };
  }
  async exists(): Promise<[boolean]> {
    await connectDB();
    return [Boolean(await PhotoBlob.exists(this.filter()))];
  }
  async getMetadata() {
    await connectDB();
    const item = await PhotoBlob.findOne(this.filter()).lean() as any;
    if (!item) throw new HttpError(404, "Photo not found.");
    return [{
      size: item.size, generation: item.generation, contentType: item.contentType,
      metadata: { validated: item.validated ? "true" : "false" },
    }];
  }
  async download(options?: { start?: number; end?: number }): Promise<[Buffer]> {
    await connectDB();
    const item = await PhotoBlob.findOne(this.filter()).select("+bytes");
    if (!item) throw new HttpError(404, "Photo not found.");
    const bytes = Buffer.from(item.bytes);
    return [options ? bytes.subarray(options.start ?? 0, options.end === undefined ? undefined : options.end + 1) : bytes];
  }
  createReadStream() {
    const file = this;
    return Readable.from((async function* () { yield (await file.download())[0]; })());
  }
  async save(bytes: Buffer, options: SaveOptions = {}) {
    await connectDB();
    // Includes legacy files; new HTTP uploads are restricted to 4 MiB.
    if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new HttpError(400, "Photo is too large.");
    try {
      await PhotoBlob.create([{
        _id: this.name, bytes, size: bytes.length, generation: randomUUID(),
        contentType: options.metadata?.contentType ?? "application/octet-stream",
        cacheControl: options.metadata?.cacheControl ?? "no-store",
        validated: options.metadata?.metadata?.validated === "true",
        ...(this.name.includes("/staging/") ? { expiresAt: new Date(Date.now() + 15 * 60_000) } : {}),
      }], { session: options.session });
    } catch (error: any) {
      // Published objects and staged uploads cannot be overwritten or replayed.
      if (error?.code === 11000) throw new HttpError(409, "This photo has already been uploaded. Start a new upload.");
      throw error;
    }
  }
  async delete(_options?: { ignoreNotFound?: boolean }) {
    await connectDB();
    await PhotoBlob.deleteOne(this.filter());
  }
}

export const mongoPhotoStorage = {
  bucket(_name: string) {
    return { file: (name: string, options?: { generation?: string }) => new MongoPhotoFile(name, options?.generation) };
  },
};
