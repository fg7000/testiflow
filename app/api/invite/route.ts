import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { collectionId, emails } = body;

  if (!collectionId || !emails || !Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json(
      { error: "collectionId and emails array are required" },
      { status: 400 }
    );
  }

  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId: user.id },
  });

  if (!collection) {
    return NextResponse.json(
      { error: "Collection not found" },
      { status: 404 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const collectionUrl = `${appUrl}/c/${collection.slug}`;

  const results = await Promise.allSettled(
    emails.map((email: string) =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: email,
        subject: `${user.user_metadata?.full_name || "Someone"} wants your video testimonial`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You've been invited to share a testimonial!</h2>
            <p>${user.user_metadata?.full_name || "Someone"} would love to hear about your experience.</p>
            <p><strong>${collection.name}</strong></p>
            ${collection.welcomeMessage ? `<p>${collection.welcomeMessage}</p>` : ""}
            <p>It only takes a minute — just click the link below, record a short video, and you're done. No signup required.</p>
            <p style="margin: 24px 0;">
              <a href="${collectionUrl}" style="background-color: ${collection.brandColor}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
                Record Your Testimonial
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">Powered by TestiFlow</p>
          </div>
        `,
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ sent, failed });
}
