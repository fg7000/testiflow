import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
      // This middleware is intentionally kept simple to avoid using Node.js APIs
  // that aren't available in Vercel's Edge Runtime (like __dirname).
  // Authentication should be handled in server components or route handlers instead.
  return NextResponse.next();
}

export const config = {
      matcher: [
              /*
               * Match all request paths except for the ones starting with:
               * - _next/static (static files)
               * - _next/image (image optimization files)
               * - favicon.ico (favicon file)
               * - public files (images, etc.)
               */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
            ],
};
