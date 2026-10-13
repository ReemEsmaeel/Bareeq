import { requirePageUser } from "@/lib/auth";
import { OrderDetail } from "./order-detail";

export const metadata = { title: "Order details | Bareeq Atelier" };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageUser(`/orders/${id}`);
  return <OrderDetail id={id} />;
}
