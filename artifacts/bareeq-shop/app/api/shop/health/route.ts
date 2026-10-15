import { handle } from "@/lib/http";
import { connectDB } from "@/lib/db";
import { assertSessionConfig } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    assertSessionConfig();
    await connectDB();
    return { status: "ok", database: "connected" };
  });
}
