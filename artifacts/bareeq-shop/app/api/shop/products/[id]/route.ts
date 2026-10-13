import { connectDB } from "@/lib/db";
import { handle, HttpError, validId } from "@/lib/http";
import { publicProduct } from "@/lib/serialize";
import { Product } from "@/models/Product";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const { id } = await context.params;
    validId(id);
    await connectDB();
    const product = await Product.findById(id).lean();
    if (!product) throw new HttpError(404, "This piece is no longer available.");
    return publicProduct(product);
  });
}
