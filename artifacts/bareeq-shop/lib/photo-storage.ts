import { Storage } from "@google-cloud/storage";
import { HttpError } from "./http";

// Replit's canonical sidecar-authenticated GCS configuration.
const endpoint = "http://127.0.0.1:1106";
const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${endpoint}/token`,
    type: "external_account",
    credential_source: {
      url: `${endpoint}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const DEFAULT_PRODUCT_IMAGE = "/bareeq-editorial.jpg";

function location(id: string, staging: boolean) {
  const directory = process.env.PRIVATE_OBJECT_DIR?.replace(/^\/|\/$/g, "");
  if (!directory) throw new HttpError(503, "Photo storage is not configured.");
  const [bucket, ...parts] = directory.split("/");
  if (!bucket || !parts.length) throw new HttpError(503, "Photo storage is not configured.");
  return { bucket, key: `${parts.join("/")}/bareeq-independent-shop/${staging ? "staging" : "photos"}/${id}` };
}

export function photoFile(id: string, staging = false) {
  const { bucket, key } = location(id, staging);
  return storage.bucket(bucket).file(key);
}

export function photoUrl(id: string) {
  return `/api/shop/media/${id}`;
}

export async function photoUploadUrl(id: string) {
  const { bucket, key } = location(id, true);
  const response = await fetch(`${endpoint}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucket,
      object_name: key,
      method: "PUT",
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
