import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import sharp from "sharp";
import { connectDB } from "../lib/db";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { Role } from "../models/Role";
import { photoStorageClient, validatePhoto } from "../lib/photo-storage";

const base = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost";
const emails = [0, 1, 2].map(() => `photo-verification-${randomUUID()}@example.invalid`);
const password = randomUUID() + "Aa1!";
const objects: { bucket: string; name: string }[] = [];
let productId: string | undefined;
let roleId: string | undefined;

async function request(path: string, body?: unknown, cookie?: string, method = body ? "POST" : "GET") {
  return fetch(`${base}/api/shop${path}`, {
    method,
    headers: { Origin: base, ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function fixture(email: string, admin: boolean) {
  const response = await request("/auth/signup", { name: "Photo verification", email, password });
  assert.equal(response.status, 201, "Temporary fixture signup failed.");
  const user = await response.json();
  if (admin) await User.updateOne({ _id: user.id }, { $set: { role: "admin" } });
  return { id: user.id, cookie: response.headers.get("set-cookie")!.split(";")[0]! };
}

async function stage(bytes: Buffer, contentType: string, cookie: string, declaredSize = bytes.length) {
  const response = await request("/admin/photos/request", { size: declaredSize, contentType }, cookie);
  assert.equal(response.status, 200, `Upload request failed: ${await response.clone().text()}`);
  const upload = await response.json();
  const path = new URL(upload.uploadURL).pathname.slice(1).split("/");
  objects.push({ bucket: path[0]!, name: decodeURIComponent(path.slice(1).join("/")) });
  const put = await fetch(upload.uploadURL, { method: "PUT", headers: { "Content-Type": contentType }, body: new Uint8Array(bytes) });
  assert.equal(put.status, 200, "App Storage PUT failed.");
  return upload;
}

try {
  await connectDB();
  const validInput = { size: 100, contentType: "image/png" };
  assert.equal((await request("/admin/photos/request", validInput)).status, 401);
  assert.equal((await request("/admin/photos/finalize", { ticket: "fake" })).status, 401);
  const admin = await fixture(emails[0]!, true);
  const shopper = await fixture(emails[1]!, false);
  const otherAdmin = await fixture(emails[2]!, true);
  const role = await Role.create({ key: `photo-verification-${randomUUID()}`, name: "Temporary photo role", nameAr: "دور صور مؤقت", permissions: ["photos"] });
  roleId = String(role._id);
  await User.updateOne({ _id: otherAdmin.id }, { $set: { role: "staff", roleId } });
  assert.equal((await request("/admin/photos/request", validInput, otherAdmin.cookie)).status, 200, "Staff with Photos permission must be able to upload.");
  assert.equal((await request("/admin/products", undefined, otherAdmin.cookie)).status, 403, "Photos permission must not grant Products access.");
  await Role.updateOne({ _id: roleId }, { $set: { permissions: ["products"] } });
  assert.equal((await request("/admin/photos/request", validInput, otherAdmin.cookie)).status, 403, "Products-only staff must not upload photos.");
  assert.equal((await request("/admin/photos/finalize", { ticket: "fake" }, otherAdmin.cookie)).status, 403, "Current Photos permission must be checked again at finalize.");
  await Role.updateOne({ _id: roleId }, { $set: { permissions: ["photos"] } });
  assert.equal((await request("/admin/photos/request", validInput, shopper.cookie)).status, 403);
  assert.equal((await request("/admin/photos/finalize", { ticket: "fake" }, shopper.cookie)).status, 403);
  assert.equal((await request("/admin/photos/request", { ...validInput, size: 8 * 1024 * 1024 + 1 }, admin.cookie)).status, 400);
  assert.equal((await request("/admin/photos/request", { ...validInput, contentType: "image/svg+xml" }, admin.cookie)).status, 400);
  assert.equal((await request("/admin/photos/finalize", { ticket: "fake" }, admin.cookie)).status, 400);
  const noOrigin = await fetch(`${base}/api/shop/admin/photos/request`, {
    method: "POST", headers: { Cookie: admin.cookie, "Content-Type": "application/json" }, body: JSON.stringify(validInput),
  });
  assert.equal(noOrigin.status, 403, "Cross-site requests must be rejected.");

  const bad = await stage(Buffer.from("<script>not a photo</script>"), "image/png", admin.cookie);
  assert.equal((await request("/admin/photos/finalize", { ticket: bad.ticket }, admin.cookie)).status, 400);
  const fake = await stage(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from("damaged")]), "image/png", admin.cookie);
  assert.equal((await request("/admin/photos/finalize", { ticket: fake.ticket }, admin.cookie)).status, 400);
  const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#456553" } }).png().toBuffer();
  const mismatched = await stage(png, "image/jpeg", admin.cookie);
  assert.equal((await request("/admin/photos/finalize", { ticket: mismatched.ticket }, admin.cookie)).status, 400);
  const wrongSize = await stage(png, "image/png", admin.cookie, png.length + 1);
  assert.equal((await request("/admin/photos/finalize", { ticket: wrongSize.ticket }, admin.cookie)).status, 400);
  const giant = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: "#456553" } }).png().toBuffer();
  await assert.rejects(validatePhoto(giant, "image/png"), /damaged, animated or too large/);

  let image = "";
  for (const format of ["png", "jpeg", "webp"] as const) {
    const bytes = await sharp(png)[format]().toBuffer();
    const pending = await stage(bytes, `image/${format}`, admin.cookie);
    assert.equal((await request("/admin/photos/finalize", { ticket: pending.ticket }, otherAdmin.cookie)).status, 403);
    const staged = objects.at(-1)!;
    const stagingId = staged.name.split("/").at(-1);
    assert.equal((await request(`/images/${stagingId}`)).status, 404, "Staging bytes must not be public.");
    const finalized = await request("/admin/photos/finalize", { ticket: pending.ticket }, admin.cookie);
    assert.equal(finalized.status, 201, `Finalize failed: ${await finalized.clone().text()}`);
    image = (await finalized.json()).image;
    assert.match(image, /^\/api\/shop\/images\/[a-f0-9-]+$/);
    const dir = process.env.PRIVATE_OBJECT_DIR!.replace(/^\/+|\/+$/g, "").split("/");
    objects.push({ bucket: dir[0]!, name: [...dir.slice(1), "independent-shop", "photos", image.split("/").at(-1)!].join("/") });
    const photo = await fetch(`${base}${image}`);
    assert.equal(photo.status, 200);
    assert.equal(photo.headers.get("content-type"), "image/webp");
    assert.equal(photo.headers.get("x-content-type-options"), "nosniff");
    assert.equal((await sharp(Buffer.from(await photo.arrayBuffer())).metadata()).width, 64);
    // Changing the still-valid upload target must not alter the final photo.
    assert.equal((await fetch(pending.uploadURL, { method: "PUT", body: "not a photo" })).status, 200);
    assert.equal((await fetch(`${base}${image}`)).status, 200);
  }
  const input = { name: "Temporary photo verification piece", nameAr: "قطعة مؤقتة", description: "Temporary verification.", descriptionAr: "تحقق مؤقت.", price: 12.34, image, category: "Lujain" };
  assert.equal((await request("/admin/products", { ...input, image: `/api/shop/images/${randomUUID()}` }, admin.cookie)).status, 400);
  const created = await request("/admin/products", input, admin.cookie);
  assert.equal(created.status, 201);
  productId = (await created.json()).id;
  assert.equal((await Product.findById(productId).lean() as any).image, image, "MongoDB must persist the durable image path.");
  assert.equal((await (await request(`/products/${productId}`)).json()).image, image);
  const catalog = await (await request("/products")).json();
  assert.equal(catalog.find((p: any) => p.id === productId).image, image);
  // An independent fresh fetch resolves the persisted reference without a ticket.
  assert.equal((await fetch(`${base}${(await Product.findById(productId) as any).image}`, { cache: "no-store" })).status, 200);
  assert.equal((await request(`/admin/products/${productId}`, { ...input, image: "/bareeq-editorial.jpg" }, admin.cookie, "PUT")).status, 200, "Existing URL/path option must still work.");
  assert.equal((await request(`/admin/products/${productId}`, input, admin.cookie, "PUT")).status, 200);
  await User.updateOne({ _id: admin.id }, { $set: { role: "customer" } });
  assert.equal((await request("/admin/photos/request", validInput, admin.cookie)).status, 403);
  assert.equal((await request("/admin/photos/finalize", { ticket: bad.ticket }, admin.cookie)).status, 403);
  console.log("Photo verification passed: authorization, CSRF, actual JPEG/PNG/WebP decoding, invalid content/size/dimensions, ticket ownership, private staging, immutable public photos, durable product persistence, catalog/detail references and URL editing.");
} finally {
  if (productId) await Product.deleteOne({ _id: productId });
  await User.deleteMany({ email: { $in: emails } });
  if (roleId) await Role.deleteOne({ _id: roleId });
  for (const object of objects) {
    await photoStorageClient.bucket(object.bucket).file(object.name).delete({ ignoreNotFound: true });
  }
  await mongoose.disconnect();
}
