import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { CancelledCheckout } from "./cancelled-checkout";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout | Bareeq Atelier" };

export default async function CheckoutCancel({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  await requirePageUser("/cart");
  const { order } = await searchParams;
  const orderId = typeof order === "string" && /^[a-f\d]{24}$/i.test(order) ? order : null;
  return <CancelledCheckout orderId={orderId} />;
}
