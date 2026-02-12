import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch {
    // If proxy fails (e.g. missing env vars), let the request through
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
  ],
};
