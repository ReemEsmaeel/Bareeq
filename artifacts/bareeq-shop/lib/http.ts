import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function handle(
  action: () => Promise<unknown>,
  status = 200,
) {
  try {
    return NextResponse.json(await action(), {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code =
      error instanceof HttpError
        ? error.status
        : error instanceof ZodError || error instanceof SyntaxError
          ? 400
          : 500;
    const message =
      error instanceof HttpError
        ? error.message
        : error instanceof ZodError
          ? error.issues.map((issue) => issue.message).join(" ")
          : error instanceof SyntaxError
            ? "Please send valid JSON."
            : "The request could not be completed. Check the shop connection settings and try again.";
    if (code === 500 && !(error instanceof HttpError)) {
      // Keep diagnostics useful without logging a URI, credentials, hashes or raw DB errors.
      console.error("[shop-api] Unexpected failure type:", error instanceof Error ? error.name : "UnknownFailure");
    }
    return NextResponse.json({ error: message }, { status: code });
  }
}

export function checkOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host;
  try {
    if (!origin || new URL(origin).host !== host) {
      throw new Error("Origin mismatch");
    }
  } catch {
    throw new HttpError(403, "This request must come from the shop.");
  }
}

export function validId(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new HttpError(400, "Invalid record identifier.");
  }
}
