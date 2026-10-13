import { requirePageUser } from "@/lib/auth";
import { OrdersList } from "./orders-list";

export const metadata = { title: "My orders | Bareeq Atelier" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  await requirePageUser("/orders");
  return <OrdersList />;
}
