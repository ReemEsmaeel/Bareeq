import { requireAdmin } from "@/lib/auth";
import { handle } from "@/lib/http";
import { adminPhoto } from "@/lib/photos";
import { Photo } from "@/models/Photo";
import { Product } from "@/models/Product";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const [photos, products] = await Promise.all([
      Photo.find({ status: { $in: ["ready", "deleting"] } }).sort({ createdAt: -1 }).lean(),
      Product.find({ image: /^\/api\/shop\/media\// }).select("name nameAr image").lean(),
    ]);
    return photos.map((photo: any) => adminPhoto(photo, products));
  });
}
