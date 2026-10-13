import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { AdminSettings } from "./settings-client";

export const metadata: Metadata = { title: "Admin settings | Bareeq Atelier" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdminPage("settings");
  return <AdminSettings />;
}
