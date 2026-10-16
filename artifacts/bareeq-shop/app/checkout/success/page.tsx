import { requirePageUser } from "@/lib/auth";
import { StripeReturn } from "@/components/stripe-return";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment status | Bareeq Atelier" };

export default async function CheckoutSuccess({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  await requirePageUser("/orders");
  const { session_id } = await searchParams;
  const valid = typeof session_id === "string" && /^cs_test_[a-zA-Z0-9_]{1,290}$/.test(session_id);
  return valid
    ? <StripeReturn sessionId={session_id} />
    : <main className="mx-auto max-w-2xl px-5 py-24 text-[#2a0006]"><h1 className="font-display text-4xl">Payment status</h1><p className="mt-4">The payment session is missing. View your orders to check its status.</p><a className="mt-8 inline-block underline" href="/orders">My orders</a></main>;
}
