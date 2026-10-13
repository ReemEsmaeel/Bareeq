import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, handle } from "@/lib/http";
import { productInput } from "@/lib/validation";
import { publicProduct } from "@/lib/serialize";
import { Product } from "@/models/Product";
import { saveProductWithPhoto } from "@/lib/photos";

export async function GET() {
  return handle(async () => {
    await requireAdmin("products");
    return (await Product.find().sort({ createdAt: -1 }).lean()).map(publicProduct);
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    await requireAdmin("products");
    const data = productInput.parse(await request.json());
    return publicProduct(await saveProductWithPhoto(data));
  }, 201);
}
