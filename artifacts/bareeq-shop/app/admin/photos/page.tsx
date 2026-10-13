import { AdminPhotos } from "./admin-photos";
import { requireAdminPage } from "@/lib/auth";

export default async function AdminPhotosPage() {
  await requireAdminPage("photos");
  return <AdminPhotos />;
}
