import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Sync user to our database (non-blocking — don't break login if DB fails)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await prisma.user.upsert({
            where: { id: user.id },
            update: {
              email: user.email!,
              name:
                user.user_metadata?.full_name ??
                user.user_metadata?.name ??
                null,
              avatarUrl: user.user_metadata?.avatar_url ?? null,
            },
            create: {
              id: user.id,
              email: user.email!,
              name:
                user.user_metadata?.full_name ??
                user.user_metadata?.name ??
                null,
              avatarUrl: user.user_metadata?.avatar_url ?? null,
            },
          });
        }
      } catch (e) {
        console.error("Failed to sync user to database:", e);
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Auth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
