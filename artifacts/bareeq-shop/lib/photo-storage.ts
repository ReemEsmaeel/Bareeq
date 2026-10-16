import { randomUUID, createHash } from "node:crypto";
import { Readable } from "node:stream";
import { SignJWT, jwtVerify } from "jose";
import sharp from "sharp";
import { z } from "zod";
import { HttpError } from "./http";
import { MongoPhotoFile, mongoPhotoStorage } from "./mongo-photo-files";

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
// Preserve the library's existing upload contract independently of direct uploads.
export const MAX_LIBRARY_PHOTO_BYTES = MAX_PHOTO_BYTES;
export const DEFAULT_PRODUCT_IMAGE = "/bareeq-editorial.jpg";
const MAX_PIXELS = 24_000_000;
const PREFIX = "/api/shop/images/";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const storage = mongoPhotoStorage;
export { storage as photoStorageClient };

function libraryLocation(id: string, staging: boolean) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new HttpError(400, "Invalid photo identifier.");
  return { bucket: "shop", key: `bareeq-independent-shop/${staging ? "staging" : "photos"}/${id}` };
}

export function photoFile(id: string, staging = false) {
  const { bucket, key } = libraryLocation(id, staging);
  return storage.bucket(bucket).file(key);
}

export function photoUrl(id: string) {
  return `/api/shop/media/${id}`;
}

export async function photoUploadUrl(id: string, owner: string, size: number, contentType: string) {
  const { key } = libraryLocation(id, true);
  return mongoUploadUrl(owner, key, size, contentType);
}

async function mongoUploadUrl(owner: string, key: string, size: number, contentType: string) {
  const token = await new SignJWT({ key, size, contentType })
    .setProtectedHeader({ alg: "HS256" }).setSubject(owner)
    .setIssuer("independent-shop-photo").setAudience("photo-upload")
    .setIssuedAt().setExpirationTime("10m").sign(ticketKey());
  return `/api/shop/admin/photos/blob?token=${encodeURIComponent(token)}`;
}

export async function verifyPhotoUpload(token: string, owner: string) {
  let payload;
  try {
    payload = (await jwtVerify(token, ticketKey(), {
      algorithms: ["HS256"], issuer: "independent-shop-photo", audience: "photo-upload",
    })).payload;
  } catch { throw new HttpError(400, "This upload has expired. Choose the photo again."); }
  if (payload.sub !== owner) throw new HttpError(403, "This upload belongs to another administrator.");
  if (typeof payload.key !== "string" || !payload.key.includes("/staging/") ||
      typeof payload.size !== "number" || !Number.isSafeInteger(payload.size) ||
      payload.size < 1 || payload.size > MAX_PHOTO_BYTES ||
      !["image/jpeg", "image/png", "image/webp"].includes(String(payload.contentType))) {
    throw new HttpError(400, "Invalid photo upload.");
  }
  return { file: new MongoPhotoFile(payload.key), size: payload.size, contentType: String(payload.contentType) };
}

export function imageType(bytes: Buffer): string | null {
  if (bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.toString("ascii", 12, 16) === "IHDR") return "image/png";
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 &&
    bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217) return "image/jpeg";
  if (bytes.length >= 20 && bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP" && bytes.readUInt32LE(4) + 8 === bytes.length) return "image/webp";
  return null;
}

export const photoRequestInput = z.object({
  size: z.number().int().min(1).max(MAX_PHOTO_BYTES, "Photos must be 4 MB or smaller."),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"], { message: "Choose a JPEG, PNG or WebP photo." }),
}).strict();

function fileAt(folder: "staging" | "photos", id: string) {
  if (!UUID.test(id)) throw new HttpError(404, "Photo not found.");
  return new MongoPhotoFile(`independent-shop/${folder}/${id}`);
}

function ticketKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new HttpError(503, "Photo uploads are temporarily unavailable.");
  return createHash("sha256").update(`shop-photo-upload:${secret}`).digest();
}

export async function requestPhotoUpload(owner: string, input: z.infer<typeof photoRequestInput>) {
  const id = randomUUID();
  const file = fileAt("staging", id);
  const signed_url = await mongoUploadUrl(owner, file.name, input.size, input.contentType);
  const ticket = await new SignJWT({ id, size: input.size, contentType: input.contentType })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(owner)
    .setIssuer("independent-shop-photo")
    .setAudience("photo-finalize")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(ticketKey());
  return { uploadURL: signed_url, ticket };
}

export async function validatePhoto(bytes: Buffer, expectedType: string) {
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) throw new HttpError(400, "Photos must be 4 MB or smaller.");
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  const type = jpeg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : null;
  if (!type || type !== expectedType) throw new HttpError(400, "The file content must match its JPEG, PNG or WebP type.");
  try {
    const image = sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: "warning" });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_PIXELS || (metadata.pages ?? 1) > 1) {
      throw new Error("Unsupported photo dimensions or animation");
    }
    // Decode the full image, remove metadata/trailing payloads, apply EXIF
    // orientation and publish a separate immutable object, never the PUT target.
    const output = await image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
    if (output.length > MAX_PHOTO_BYTES) throw new Error("Optimized image exceeds the delivery limit");
    return output;
  } catch {
    throw new HttpError(400, "This photo is damaged, animated or too large to decode. Use a still photo of up to 24 megapixels.");
  }
}

export async function finalizePhoto(owner: string, ticket: string) {
  let payload;
  try {
    payload = (await jwtVerify(ticket, ticketKey(), {
      algorithms: ["HS256"], issuer: "independent-shop-photo", audience: "photo-finalize",
    })).payload;
  } catch {
    throw new HttpError(400, "This upload has expired. Please select the photo again.");
  }
  if (payload.sub !== owner) throw new HttpError(403, "This upload belongs to another administrator.");
  if (typeof payload.id !== "string" || typeof payload.contentType !== "string" || typeof payload.size !== "number") {
    throw new HttpError(400, "Invalid photo upload.");
  }
  const pending = fileAt("staging", payload.id);
  const [exists] = await pending.exists();
  if (!exists) throw new HttpError(400, "The upload did not finish. Please select the photo again.");
  const [metadata] = await pending.getMetadata();
  // Pin the generation so a still-valid PUT URL cannot replace bytes between
  // the size check and validation. Staging is never publicly served.
  const snapshot = storage.bucket(pending.bucket.name).file(pending.name, { generation: metadata.generation });
  try {
    const size = Number(metadata.size);
    if (size !== payload.size || size > MAX_PHOTO_BYTES || size < 1) {
      throw new HttpError(400, "The uploaded photo size does not match. Use a photo of 4 MB or smaller and try again.");
    }
    const [bytes] = await snapshot.download();
    const safePhoto = await validatePhoto(bytes, payload.contentType);
    const id = randomUUID();
    await fileAt("photos", id).save(safePhoto, {
      resumable: false,
      preconditionOpts: { ifGenerationMatch: 0 },
      metadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable", metadata: { validated: "true" } },
    });
    return { image: `${PREFIX}${id}` };
  } finally {
    await snapshot.delete({ ignoreNotFound: true }).catch(() => {
      console.error("[shop-photo] Staging cleanup failed.");
    });
  }
}

export async function assertPhotoReference(image: string) {
  if (!image.startsWith("/api/shop/images")) return;
  if (!image.startsWith(PREFIX)) throw new HttpError(400, "Use a completed photo upload.");
  const file = fileAt("photos", image.slice(PREFIX.length));
  const [exists] = await file.exists();
  if (!exists) throw new HttpError(400, "This uploaded photo is no longer available. Please upload it again.");
  const [metadata] = await file.getMetadata();
  if (metadata.metadata?.validated !== "true") throw new HttpError(400, "Use a completed photo upload.");
}

export async function servePhoto(id: string) {
  const file = fileAt("photos", id);
  const [exists] = await file.exists();
  if (!exists) throw new HttpError(404, "Photo not found.");
  const [metadata] = await file.getMetadata();
  if (metadata.metadata?.validated !== "true") throw new HttpError(404, "Photo not found.");
  return new Response(Readable.toWeb(file.createReadStream()) as ReadableStream, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(metadata.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
