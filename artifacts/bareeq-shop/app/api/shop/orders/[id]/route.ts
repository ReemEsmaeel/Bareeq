import { requireUser } from "@/lib/auth";
import { handle, HttpError, validId } from "@/lib/http";
import { publicOrder } from "@/lib/serialize";
import { Order } from "@/models/Order";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await context.params;
    validId(id);
    const order = await Order.findOne({ _id: id, user: user._id }).lean();
    if (!order) throw new HttpError(404, "This order was not found.");
    return publicOrder(order);
  });
}
