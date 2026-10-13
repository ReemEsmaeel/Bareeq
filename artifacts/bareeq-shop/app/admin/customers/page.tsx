import { AdminCustomers } from "./admin-customers";
import { requireAdminPage } from "@/lib/auth";

export const metadata = { title: "Manage customers | Bareeq Atelier" };

export default async function AdminCustomersPage() {
  await requireAdminPage("customers");
  return <AdminCustomers />;
}
