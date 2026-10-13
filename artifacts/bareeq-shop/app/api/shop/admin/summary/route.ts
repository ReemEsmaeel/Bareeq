import { requireAdmin } from "@/lib/auth";
import { handle } from "@/lib/http";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { Order } from "@/models/Order";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const [products, customers, orders, pendingOrders, value] = await Promise.all([
      Product.countDocuments(),
      User.countDocuments({ role: "customer" }),
      Order.countDocuments(),
      Order.countDocuments({ status: "pending" }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
    ]);
    return { products, customers, orders, pendingOrders, orderValue: value[0]?.total || 0 };
  });
}
