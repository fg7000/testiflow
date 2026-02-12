import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch {
    // If middleware fails (e.g. missing env vars), let the request through
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Run middleware only on routes that need auth protection:
     * - /dashboard (and sub-routes)
     * - /login
     * Exclude static files, images, favicon, _next, and API routes.
     */
    "/dashboard/:path*",
    "/login",
  ],
};
