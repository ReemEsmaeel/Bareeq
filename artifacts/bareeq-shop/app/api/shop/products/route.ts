import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { handle } from "@/lib/http";
import { publicProduct } from "@/lib/serialize";
import { Product } from "@/models/Product";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handle(async () => {
    await connectDB();
    const category = request.nextUrl.searchParams.get("category");
    const query = category ? { category } : {};
    const products = await Product.find(query).sort({ createdAt: -1 }).lean();
    return products.map(publicProduct);
  });
}
