import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, handle } from "@/lib/http";
import { productInput } from "@/lib/validation";
import { publicProduct } from "@/lib/serialize";
import { Product } from "@/models/Product";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    return (await Product.find().sort({ createdAt: -1 }).lean()).map(publicProduct);
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    await requireAdmin();
    const data = productInput.parse(await request.json());
    return publicProduct(await Product.create(data));
  }, 201);
}
