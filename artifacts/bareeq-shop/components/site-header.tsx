"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useShop } from "./shop-provider";
import { hasAdminAccess } from "@/lib/permissions";

const labels = {
  en: {
    announcement: "A quieter kind of shine · Hand-finished in sterling silver",
    products: "Pieces", cart: "Bag", orders: "Orders", admin: "Admin", account: "Account",
    login: "Sign in", signup: "Join", logout: "Sign out", leaving: "Signing out", lang: "العربية",
    menu: "Open menu", close: "Close menu", hello: "Hello",
  },
  ar: {
    announcement: "بريق هادئ · فضة إسترلينية تُصاغ بعناية",
    products: "القطع", cart: "الحقيبة", orders: "الطلبات", admin: "الإدارة", account: "حسابي",
    login: "تسجيل الدخول", signup: "انضمي", logout: "تسجيل الخروج", leaving: "جارٍ الخروج", lang: "English",
    menu: "افتحي القائمة", close: "أغلقي القائمة", hello: "أهلاً",
  },
};

export function SiteHeader() {
  const { language, setLanguage, user, authLoading, authError, clearUser, refreshUser } = useShop();
  const t = labels[language];
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const isArabic = language === "ar";

  useEffect(() => setMenuOpen(false), [pathname]);

  async function logout() {
    setLeaving(true);
    setLogoutError("");
    try {
      await api<{ success: true }>("/auth/logout", { method: "POST" });
      clearUser();
      router.push("/");
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Sign out failed. Please try again.");
    } finally {
      setLeaving(false);
    }
  }

  const links = [
    { href: "/products", label: t.products },
    { href: "/cart", label: t.cart },
    ...(user ? [{ href: "/orders", label: t.orders }] : []),
    ...(hasAdminAccess(user) ? [{ href: "/admin", label: t.admin }] : []),
  ];
  const linkClass = (href: string) =>
    `eyebrow transition-colors hover:text-[#456553] ${pathname === href ? "text-[#456553]" : ""}`;

  const accountArea = authLoading ? (
    <span className="h-3 w-20 animate-pulse rounded-full bg-[#2a0006]/10" aria-hidden="true" />
  ) : user ? (
    <>
      <Link href="/account" className="max-w-[150px] truncate text-[11px] font-semibold text-[#2a0006] hover:text-[#456553]">
        {t.hello}, {user.name.split(" ")[0]}
      </Link>
      <button onClick={logout} disabled={leaving} className="eyebrow text-[#796d68] hover:text-[#2a0006] disabled:opacity-50">
        {leaving ? t.leaving : t.logout}
      </button>
    </>
  ) : (
    <>
      <Link href="/login" className="eyebrow hover:text-[#456553]">{t.login}</Link>
      <Link href="/signup" className="eyebrow border-b border-[#2a0006]/30 pb-0.5 hover:text-[#456553]">{t.signup}</Link>
    </>
  );

  return (
    <>
      <div className="flex min-h-[30px] items-center justify-center bg-[#2a0006] px-4 py-2 text-center text-[9px] font-semibold tracking-[.14em] text-[#f6fbf5] sm:text-[10px]">
        {t.announcement}
      </div>
      <header className="relative z-30 border-b border-[#2a0006]/10 bg-[#f6fbf5]" dir={isArabic ? "rtl" : "ltr"}>
        <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-5 sm:px-9 lg:h-[88px] lg:px-[5%]">
          <button
            aria-label={menuOpen ? t.close : t.menu}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center text-[#2a0006] lg:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              {menuOpen ? <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.3" /> : <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.3" />}
            </svg>
          </button>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
            {links.map((link) => <Link key={link.href} href={link.href} className={linkClass(link.href)}>{link.label}</Link>)}
          </nav>
          <Link href="/" aria-label="Bareeq Atelier home" className="absolute left-1/2 -translate-x-1/2 text-center text-[#2a0006]">
            <span className="block font-display text-[27px] font-medium leading-none tracking-[.08em] sm:text-[31px]">BAREEQ</span>
            <span className="mt-[5px] block text-[8px] font-semibold tracking-[.34em]">ATELIER</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden items-center gap-5 lg:flex">{accountArea}</div>
            <button
              className="rounded-full border border-[#2a0006]/20 px-3.5 py-2 text-[10px] font-semibold tracking-[.08em] text-[#2a0006] transition-colors hover:bg-[#2a0006] hover:text-[#f6fbf5] sm:px-4"
              onClick={() => setLanguage(isArabic ? "en" : "ar")}
              aria-label={isArabic ? "Switch language to English" : "التبديل إلى العربية"}
            >
              {t.lang}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav aria-label="Mobile navigation" className="absolute inset-x-0 top-full border-t border-[#2a0006]/10 bg-[#f6fbf5] px-6 py-5 shadow-lg shadow-[#2a0006]/5 lg:hidden">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="block border-b border-[#2a0006]/10 py-4 font-display text-xl text-[#2a0006]">{link.label}</Link>
            ))}
            <div className="flex flex-wrap items-center gap-6 pt-5">{accountArea}</div>
          </nav>
        )}
      </header>
      {(authError || logoutError) && (
        <div role="alert" className="bg-[#4a0e17]/5 px-5 py-3 text-center text-sm text-[#4a0e17]">
          {logoutError || authError}
          {authError && <button onClick={() => void refreshUser()} className="ms-3 underline">{isArabic ? "إعادة المحاولة" : "Retry"}</button>}
        </div>
      )}
    </>
  );
}
