"use client";

import Link from "next/link";
import { useShop } from "@/components/shop-provider";

export function CancelledCheckout({ orderId }: { orderId: string | null }) {
  const { language } = useShop();
  const ar = language === "ar";
  return (
    <main className="page-grain mx-auto max-w-[760px] px-5 pb-24 pt-16 sm:px-9 lg:pt-24" dir={ar ? "rtl" : "ltr"}>
      <p className="eyebrow text-[#456553]">{ar ? "إتمام الشراء" : "Checkout"}</p>
      <h1 className={`mt-4 text-[clamp(2.3rem,6vw,4rem)] leading-tight text-[#2a0006] ${ar ? "font-arabic" : "font-display"}`}>{ar ? "تم إلغاء الدفع." : "Checkout was cancelled."}</h1>
      <p className="mt-5 text-[14px] leading-[1.9] text-[#796d68]">{ar ? "لم يتم تحصيل أي مبلغ. طلبكِ محفوظ ويمكنكِ المحاولة مجدداً." : "You have not been charged. Your order is saved, and you can try payment again whenever you’re ready."}</p>
      <div className="mt-8 flex flex-wrap gap-4">
        {orderId && <Link className="inline-flex min-h-12 items-center justify-center bg-[#2a0006] px-6 py-3 text-[11px] font-semibold tracking-[.1em] text-[#f6fbf5] hover:bg-[#456553]" href={`/orders/${orderId}`}>{ar ? "العودة إلى الطلب" : "Return to your order"}</Link>}
        <Link className="inline-flex min-h-12 items-center justify-center px-4 py-3 text-[11px] font-semibold tracking-[.1em] text-[#456553] underline underline-offset-4" href="/orders">{ar ? "طلباتي" : "My orders"}</Link>
      </div>
    </main>
  );
}
