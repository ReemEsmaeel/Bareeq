import { requireAdmin } from "@/lib/auth";
import { handle } from "@/lib/http";
import { publicUser } from "@/lib/serialize";
import { User } from "@/models/User";

export async function GET() {
  return handle(async () => {
    await requireAdmin("customers");
    const users = await User.find({ role: "customer" })
      .select("name email role active createdAt").sort({ createdAt: -1 }).lean();
    return users.map(publicUser);
  });
}
