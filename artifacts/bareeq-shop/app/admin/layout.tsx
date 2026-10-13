import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin-ui";
import { requireAdminPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminPage();
  return (
    <div className="page-grain mx-auto max-w-[1280px] px-5 pb-24 pt-8 sm:px-9 lg:grid lg:grid-cols-[200px_1fr] lg:gap-12 lg:pt-14">
      <AdminNav />
      <main className="min-w-0 pt-8 lg:pt-0">{children}</main>
    </div>
  );
}
