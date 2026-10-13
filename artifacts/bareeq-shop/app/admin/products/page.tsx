import { AdminProducts } from "./admin-products";
import { requireAdminPage } from "@/lib/auth";

export const metadata = { title: "Manage pieces | Bareeq Atelier" };

export default async function AdminProductsPage() {
  await requireAdminPage("products");
  return <AdminProducts />;
}
