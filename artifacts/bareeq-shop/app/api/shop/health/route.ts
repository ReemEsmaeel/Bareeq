import { handle } from "@/lib/http";
import { connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await connectDB();
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing.");
    }
    return { status: "ok", database: "connected" };
  });
}
