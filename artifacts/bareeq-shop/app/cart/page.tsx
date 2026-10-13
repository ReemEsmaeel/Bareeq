import { requirePageUser } from "@/lib/auth";
import { CartView } from "./cart-view";

export const metadata = { title: "Your bag | Bareeq Atelier" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  await requirePageUser("/cart");
  return <CartView />;
}
