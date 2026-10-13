import { currentUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import { publicUser } from "@/lib/serialize";

export async function GET() {
  return handle(async () => {
    const user = await currentUser();
    return user ? publicUser(user) : null;
  });
}
