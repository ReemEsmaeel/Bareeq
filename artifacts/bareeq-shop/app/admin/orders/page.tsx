import { AdminOrders } from "./admin-orders";
import { requireAdminPage } from "@/lib/auth";

export const metadata = { title: "Manage orders | Bareeq Atelier" };

export default async function AdminOrdersPage() {
  await requireAdminPage("orders");
  return <AdminOrders />;
}
