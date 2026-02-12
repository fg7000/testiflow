import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  try {
    // Dynamic import so errors are catchable (static imports fail at module load time)
    const { updateSession } = await import("@/lib/supabase/middleware");
    return await updateSession(request);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
