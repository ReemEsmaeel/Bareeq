import { requireAdmin } from "@/lib/auth";
import { handle } from "@/lib/http";
import { adminOrder } from "@/lib/serialize";
import { Order } from "@/models/Order";

export async function GET() {
  return handle(async () => {
    await requireAdmin("orders");
    const orders = await Order.find().sort({ createdAt: -1 })
      .populate("user", "name email role active createdAt").lean();
    return orders.map(adminOrder);
  });
}
