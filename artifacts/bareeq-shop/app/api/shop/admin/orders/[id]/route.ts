import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { checkOrigin, handle, HttpError, validId } from "@/lib/http";
import { adminOrder } from "@/lib/serialize";
import { Order } from "@/models/Order";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    checkOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    validId(id);
    const data = z.object({ status: z.enum(["pending", "paid"]) }).strict().parse(await request.json());
    const order = await Order.findByIdAndUpdate(id, { $set: data }, { returnDocument: "after", runValidators: true })
      .populate("user", "name email role active createdAt");
    if (!order) throw new HttpError(404, "This order was not found.");
    return adminOrder(order);
  });
}
