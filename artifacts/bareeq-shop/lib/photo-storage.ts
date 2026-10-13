import { randomUUID, createHash } from "node:crypto";
import { Readable } from "node:stream";
import { Storage } from "@google-cloud/storage";
import { SignJWT, jwtVerify } from "jose";
import sharp from "sharp";
import { z } from "zod";
import { HttpError } from "./http";

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
// Preserve the library's existing upload contract independently of direct uploads.
export const MAX_LIBRARY_PHOTO_BYTES = 5 * 1024 * 1024;
export const DEFAULT_PRODUCT_IMAGE = "/bareeq-editorial.jpg";
const MAX_PIXELS = 24_000_000;
const PREFIX = "/api/shop/images/";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SIDECAR = "http://127.0.0.1:1106";

// Replit App Storage's standard sidecar authentication.
const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${SIDECAR}/token`,
    type: "external_account",
    credential_source: {
      url: `${SIDECAR}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});
export { storage as photoStorageClient };

function libraryLocation(id: string, staging: boolean) {
  const directory = process.env.PRIVATE_OBJECT_DIR?.replace(/^\/|\/$/g, "");
  if (!directory) throw new HttpError(503, "Photo storage is not configured.");
  const [bucket, ...parts] = directory.split("/");
  if (!bucket || !parts.length) throw new HttpError(503, "Photo storage is not configured.");
  return { bucket, key: `${parts.join("/")}/bareeq-independent-shop/${staging ? "staging" : "photos"}/${id}` };
}

export function photoFile(id: string, staging = false) {
  const { bucket, key } = libraryLocation(id, staging);
  return storage.bucket(bucket).file(key);
}

export function photoUrl(id: string) {
  return `/api/shop/media/${id}`;
}

export async function photoUploadUrl(id: string) {
  const { bucket, key } = libraryLocation(id, true);
  const response = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucket, object_name: key, method: "PUT",
      expires_at: new Date(Date.now() + 5 * 60000).toISOString(),
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new HttpError(503, "Photo storage is unavailable. Try uploading again later.");
  const result = await response.json();
  if (typeof result.signed_url !== "string") throw new HttpError(503, "Photo storage could not prepare this upload.");
  return result.signed_url as string;
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
  size: z.number().int().min(1).max(MAX_PHOTO_BYTES, "Photos must be 8 MB or smaller."),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"], { message: "Choose a JPEG, PNG or WebP photo." }),
}).strict();

function fileAt(folder: "staging" | "photos", id: string) {
  if (!UUID.test(id)) throw new HttpError(404, "Photo not found.");
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) throw new HttpError(503, "Photo storage is not configured. Please try again later.");
  const [bucket, ...path] = dir.replace(/^\/+|\/+$/g, "").split("/");
  return storage.bucket(bucket).file([...path, "independent-shop", folder, id].join("/"));
}

function ticketKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new HttpError(503, "Photo uploads are temporarily unavailable.");
  return createHash("sha256").update(`shop-photo-upload:${secret}`).digest();
}

export async function requestPhotoUpload(owner: string, input: z.infer<typeof photoRequestInput>) {
  const id = randomUUID();
  const file = fileAt("staging", id);
  const response = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: file.bucket.name,
      object_name: file.name,
      method: "PUT",
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new HttpError(503, "Photo storage is unavailable. Please try again.");
  const { signed_url } = await response.json();
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
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) throw new HttpError(400, "Photos must be 8 MB or smaller.");
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
    return await image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
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
      throw new HttpError(400, "The uploaded photo size does not match. Use a photo of 8 MB or smaller and try again.");
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
