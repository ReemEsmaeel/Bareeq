import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { Photo } from "../models/Photo";
import { photoFile, DEFAULT_PRODUCT_IMAGE } from "../lib/photo-storage";

const base = "http://localhost";
const emails = [0, 1].map(() => `photo-verification-${randomUUID()}@example.invalid`);
const password = randomUUID() + "Aa1!";
const photoIds: string[] = [];
let productId: string | undefined;

async function request(path: string, method = "GET", body?: unknown, cookie?: string) {
  return fetch(`${base}/api/shop${path}`, {
    method,
    headers: {
      Origin: base,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function signup(email: string) {
  const response = await request("/auth/signup", "POST", { name: "Photo verification", email, password });
  assert.equal(response.status, 201);
  return { user: await response.json(), cookie: response.headers.get("set-cookie")!.split(";")[0]! };
}

async function upload(bytes: Buffer, cookie: string, contentType = "image/jpeg") {
  const signed = await request("/admin/photos/upload-url", "POST",
    { name: "Verification photo", size: bytes.length, contentType }, cookie);
  assert.equal(signed.status, 201, "Signed upload preparation must succeed.");
  const { id, uploadURL } = await signed.json();
  photoIds.push(id);
  const uploaded = await fetch(uploadURL, {
    method: "PUT", headers: { "Content-Type": contentType }, body: new Uint8Array(bytes),
  });
  assert.equal(uploaded.status, 200, "Direct storage upload must succeed.");
  return { id, uploadURL };
}

try {
  await connectDB();
  const admin = await signup(emails[0]!);
  const customer = await signup(emails[1]!);
  await User.updateOne({ _id: admin.user.id }, { $set: { role: "admin" } });
  assert.equal((await request("/admin/photos")).status, 401);
  assert.equal((await request("/admin/photos", "GET", undefined, customer.cookie)).status, 403);
  assert.equal((await request("/admin/photos/upload-url", "POST",
    { name: "No access", size: 12, contentType: "image/jpeg" }, customer.cookie)).status, 403);
  for (const data of [
    { name: "Too large", size: 5 * 1024 * 1024 + 1, contentType: "image/jpeg" },
    { name: "Wrong type", size: 12, contentType: "image/svg+xml" },
  ]) {
    assert.equal((await request("/admin/photos/upload-url", "POST", data, admin.cookie)).status, 400);
  }
  const input = {
    name: "Photo verification temporary piece", nameAr: "قطعة مؤقتة للتحقق من الصور",
    description: "Removed after verification.", descriptionAr: "تُحذف بعد التحقق.",
    price: 22.50, image: "/api/shop/media/000000000000000000000000", category: "Lujain",
  };
  assert.equal((await request("/admin/products", "POST", input, admin.cookie)).status, 409,
    "Unverified/deleted image paths cannot be attached.");
  const invalid = await upload(Buffer.from("<svg>not an image</svg>"), admin.cookie);
  assert.equal((await request(`/admin/photos/${invalid.id}/complete`, "POST", {}, admin.cookie)).status, 400);
  assert.equal((await request(`/media/${invalid.id}`)).status, 404, "Unverified uploads stay private.");

  const bytes = await readFile(new URL("../public/bareeq-editorial.jpg", import.meta.url));
  const uploaded = await upload(bytes, admin.cookie);
  const completed = await request(`/admin/photos/${uploaded.id}/complete`, "POST", {}, admin.cookie);
  assert.equal(completed.status, 200);
  const photo = await completed.json();
  assert.equal(photo.status, "ready");
  assert.equal(photo.url, `/api/shop/media/${uploaded.id}`);
  assert.equal("objectKey" in photo, false);
  assert.equal("uploadURL" in photo, false);
  const served = await request(`/media/${uploaded.id}`);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("content-type"), "image/jpeg");
  assert.equal(served.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await served.arrayBuffer()), bytes);

  // A still-valid signed upload cannot rewrite the published object.
  await fetch(uploaded.uploadURL, {
    method: "PUT", headers: { "Content-Type": "image/jpeg" },
    body: new Uint8Array(Buffer.from("not a photo")),
  });
  assert.deepEqual(Buffer.from(await (await request(`/media/${uploaded.id}`)).arrayBuffer()), bytes);
  const created = await request("/admin/products", "POST", { ...input, image: photo.url }, admin.cookie);
  assert.equal(created.status, 201);
  productId = (await created.json()).id;
  const library = await (await request("/admin/photos", "GET", undefined, admin.cookie)).json();
  assert.ok(library.find((p: any) => p.id === uploaded.id).usedBy.some((p: any) => p.id === productId));
  const summary = await (await request("/admin/summary", "GET", undefined, admin.cookie)).json();
  assert.ok(summary.photoCount >= 1);
  assert.equal(summary.collections.length, 3);
  assert.ok(Array.isArray(summary.latestOrders));
  assert.equal((await request(`/admin/photos/${uploaded.id}`, "DELETE", undefined, customer.cookie)).status, 403);
  assert.equal((await fetch(`${base}/api/shop/admin/photos/${uploaded.id}`, {
    method: "DELETE", headers: { Origin: "https://other.example", Cookie: admin.cookie },
  })).status, 403);

  const [save, deleted] = await Promise.all([
    request(`/admin/products/${productId}`, "PUT", { ...input, image: photo.url }, admin.cookie),
    request(`/admin/photos/${uploaded.id}`, "DELETE", undefined, admin.cookie),
  ]);
  assert.ok([200, 409].includes(save.status));
  assert.equal(deleted.status, 200, "Deletion should serialize against attachment.");
  assert.equal((await (await request(`/products/${productId}`)).json()).image, DEFAULT_PRODUCT_IMAGE);
  assert.equal((await request(`/media/${uploaded.id}`)).status, 404);
  assert.equal((await photoFile(uploaded.id).exists())[0], false);
  assert.equal((await photoFile(uploaded.id, true).exists())[0], false);
  assert.equal((await request("/admin/products", "POST", { ...input, image: photo.url }, admin.cookie)).status, 409);
  console.log("Photo verification passed: admin/CSRF guards, limits, actual-image validation, stable public serving, immutable publication, usage listing, dashboard data, race-safe attachment/deletion, physical file removal and product fallback.");
} finally {
  for (const id of photoIds) {
    await Promise.all([
      photoFile(id).delete({ ignoreNotFound: true }),
      photoFile(id, true).delete({ ignoreNotFound: true }),
    ]).catch(() => {});
  }
  await connectDB();
  await Photo.deleteMany({ _id: { $in: photoIds } });
  if (productId) await Product.deleteOne({ _id: productId });
  await User.deleteMany({ email: { $in: emails } });
  await mongoose.disconnect();
}
