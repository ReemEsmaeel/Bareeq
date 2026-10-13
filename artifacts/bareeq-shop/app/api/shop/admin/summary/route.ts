import { requireAdmin } from "@/lib/auth";
import { handle } from "@/lib/http";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { Photo } from "@/models/Photo";
import { adminOrder } from "@/lib/serialize";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const [products, customers, orders, pendingOrders, value, paidOrders, activeCustomers, photoCount, latestOrders, grouped] = await Promise.all([
      Product.countDocuments(),
      User.countDocuments({ role: "customer" }),
      Order.countDocuments(),
      Order.countDocuments({ status: "pending" }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
      Order.countDocuments({ status: "paid" }),
      User.countDocuments({ role: "customer", active: true }),
      Photo.countDocuments({ status: "ready" }),
      Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email role active createdAt").lean(),
      Product.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    ]);
    return {
      products, customers, orders, pendingOrders, orderValue: value[0]?.total || 0,
      paidOrders, activeCustomers, photoCount, latestOrders: latestOrders.map(adminOrder),
      collections: ["Lujain", "Rawnaq", "Wahaj"].map((category) => ({
        category, count: grouped.find((row: any) => row._id === category)?.count || 0,
      })),
    };
  });
}
