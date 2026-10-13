import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, handle, HttpError, validId } from "@/lib/http";
import { productInput } from "@/lib/validation";
import { publicProduct } from "@/lib/serialize";
import { Product } from "@/models/Product";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    checkOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    validId(id);
    const data = productInput.parse(await request.json());
    const product = await Product.findByIdAndUpdate(id, { $set: data }, { returnDocument: "after", runValidators: true });
    if (!product) throw new HttpError(404, "This piece was not found.");
    return publicProduct(product);
  });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    checkOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    validId(id);
    const product = await Product.findByIdAndDelete(id);
    if (!product) throw new HttpError(404, "This piece was not found.");
    // Order item snapshots preserve history after a product is removed.
    return { success: true };
  });
}
