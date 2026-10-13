import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { mutateCart, readCart } from "@/lib/cart";
import { checkOrigin, handle, HttpError, validId } from "@/lib/http";

const itemInput = z.object({
  productId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid product identifier."),
  quantity: z.number().int().min(0).max(20),
}).strict();

export async function GET() {
  return handle(async () => readCart(await requireUser()));
}

async function update(request: NextRequest, mode: "add" | "set") {
  return handle(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const data = itemInput.parse(await request.json());
    validId(data.productId);
    if (mode === "add" && data.quantity === 0) {
      throw new HttpError(400, "Quantity must be positive.");
    }
    return mutateCart(String(user._id), data.productId, data.quantity, mode);
  });
}

export async function POST(request: NextRequest) { return update(request, "add"); }
export async function PATCH(request: NextRequest) { return update(request, "set"); }
export async function DELETE(request: NextRequest) {
  return handle(async () => {
    checkOrigin(request);
    const user = await requireUser();
    return mutateCart(String(user._id), null, 0, "clear");
  });
}
