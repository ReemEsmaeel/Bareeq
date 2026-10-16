/**
 * Copy only this independent shop's published files. Dry-run by default.
 * Run in Replit, where the OLD storage credentials are available:
 * pnpm --filter @workspace/bareeq-shop exec tsx scripts/migrate-photos-to-mongo.ts --apply
 * Never deletes source files, changes product URLs, or overwrites a destination.
 */
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { Storage } from "@google-cloud/storage";
import { connectDB } from "../lib/db";
import { MongoPhotoFile } from "../lib/mongo-photo-files";
import { Photo } from "../models/Photo";
import { Product } from "../models/Product";
import { imageType } from "../lib/photo-storage";

const apply = process.argv.includes("--apply");
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const sidecar = "http://127.0.0.1:1106";
const source = new Storage({
  credentials: {
    audience: "replit", subject_token_type: "access_token",
    token_url: `${sidecar}/token`, type: "external_account",
    credential_source: { url: `${sidecar}/credential`, format: { type: "json", subject_token_field_name: "access_token" } },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

async function main() {
  const directory = process.env.PRIVATE_OBJECT_DIR?.replace(/^\/+|\/+$/g, "");
  if (!directory) throw new Error("Run the migration in the Replit project with its existing photo storage configured.");
  const [bucket, ...parts] = directory.split("/");
  if (!bucket || !parts.length) throw new Error("The old photo storage directory is not configured.");
  const root = `${parts.join("/")}/`;
  await connectDB();
  const required = new Set<string>();
  const ready = await Photo.find({ status: "ready" }).select("_id").lean();
  for (const photo of ready) required.add(`bareeq-independent-shop/photos/${photo._id}`);
  for (const product of await Product.find().select("image").lean() as any[]) {
    const id = /^\/api\/shop\/images\/([a-f\d-]+)$/i.exec(product.image)?.[1];
    if (id) required.add(`independent-shop/photos/${id}`);
  }
  const seen = new Set<string>();
  let copied = 0, verified = 0;
  for (const namespace of ["bareeq-independent-shop", "independent-shop"]) {
    const [files] = await source.bucket(bucket).getFiles({ prefix: `${root}${namespace}/photos/` });
    for (const file of files) {
      const key = file.name.slice(root.length);
      const destination = new MongoPhotoFile(key);
      const [metadata] = await file.getMetadata();
      const size = Number(metadata.size);
      if (!Number.isSafeInteger(size) || size < 1 || size > 8 * 1024 * 1024) {
        throw new Error(`Cannot safely copy published photo ${key}: unsupported size.`);
      }
      const snapshot = source.bucket(bucket).file(file.name, { generation: metadata.generation });
      const [bytes] = await snapshot.download({ start: 0, end: 8 * 1024 * 1024 });
      const contentType = imageType(bytes);
      if (bytes.length !== size || !contentType) throw new Error(`Published photo ${key} failed integrity checks.`);
      if (namespace === "independent-shop" && metadata.metadata?.validated !== "true") continue;
      if ((await destination.exists())[0]) {
        if (hash((await destination.download())[0]) !== hash(bytes)) {
          throw new Error(`Destination conflict for ${key}; no files were overwritten.`);
        }
        verified++;
      } else if (apply) {
        await destination.save(bytes, {
          metadata: { contentType, cacheControl: "no-store", metadata: { validated: "true" } },
        });
        if (hash((await destination.download())[0]) !== hash(bytes)) throw new Error(`Copy verification failed for ${key}.`);
        copied++;
      } else {
        copied++;
      }
      seen.add(key);
    }
  }
  // Supports safe re-runs even when an old source has since become unavailable.
  for (const key of required) {
    if (!seen.has(key) && !(await new MongoPhotoFile(key).exists())[0]) {
      throw new Error(`A referenced photo is missing from both stores: ${key}.`);
    }
  }
  console.log(JSON.stringify({ mode: apply ? "copied" : "dry-run", copied, alreadyVerified: verified,
    referencedPhotos: required.size, sourceFilesDeleted: 0, productUrlsChanged: 0 }));
}

main().catch((error) => {
  // Never print raw storage/DB errors, which can contain signed URLs or credentials.
  console.error(error instanceof Error && /^(Run the migration|The old photo|Cannot safely|Published photo|Destination conflict|Copy verification|A referenced photo)/.test(error.message)
    ? error.message : "Photo migration failed. Check database and original storage access.");
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
