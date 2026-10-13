import { requirePageUser } from "@/lib/auth";
import { AccountForm } from "./account-form";

export const metadata = { title: "Your account | Bareeq Atelier" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requirePageUser("/account");
  return (
    <AccountForm
      initialName={String(user.name)}
      email={String(user.email)}
      memberSince={new Date(user.createdAt).toISOString()}
    />
  );
}
