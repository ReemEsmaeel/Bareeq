import { requireStaffAccess } from "@/lib/auth";
import { handle } from "@/lib/http";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { Photo } from "@/models/Photo";
import { adminOrder } from "@/lib/serialize";
import { permissionsFor } from "@/lib/permissions";

export async function GET() {
  return handle(async () => {
    const actor = await requireStaffAccess();
    const permissions = permissionsFor(actor);
    const can = (section: "products" | "photos" | "orders" | "customers") => permissions.includes(section);
    const [products, customers, orders, pendingOrders, value, paidOrders, activeCustomers, photoCount, latestOrders, grouped] = await Promise.all([
      can("products") ? Product.countDocuments() : null,
      can("customers") ? User.countDocuments({ role: "customer" }) : null,
      can("orders") ? Order.countDocuments() : null,
      can("orders") ? Order.countDocuments({ status: "pending" }) : null,
      can("orders") ? Order.aggregate([
        { $group: { _id: { $ifNull: ["$currency", "SAR"] }, total: { $sum: "$total" } } },
      ]) : null,
      can("orders") ? Order.countDocuments({ status: "paid" }) : null,
      can("customers") ? User.countDocuments({ role: "customer", active: true }) : null,
      can("photos") ? Photo.countDocuments({ status: "ready" }) : null,
      can("orders") ? Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email role active createdAt").lean() : [],
      can("products") ? Product.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]) : [],
    ]);
    return {
      products, customers, orders, pendingOrders,
      orderValue: value ? value.find((row: any) => row._id === "KWD")?.total || 0 : null,
      orderValueSAR: value ? value.find((row: any) => row._id === "SAR")?.total || 0 : null,
      paidOrders, activeCustomers, photoCount, latestOrders: latestOrders.map(adminOrder),
      collections: (can("products") ? ["Lujain", "Rawnaq", "Wahaj"] : []).map((category) => ({
        category, count: grouped.find((row: any) => row._id === category)?.count || 0,
      })),
    };
  });
}
