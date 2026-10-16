import { requirePageUser } from "@/lib/auth";
import { OrderDetail } from "./order-detail";

export const metadata = { title: "Order details | Bareeq Atelier" };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ checkout?: string }> }) {
  const { id } = await params;
  const { checkout } = await searchParams;
  await requirePageUser(`/orders/${id}`);
  return <OrderDetail id={id} checkoutRetry={checkout === "retry"} />;
}
