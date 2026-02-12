import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");

  // Verify ownership through collection
  const existing = await prisma.video.findFirst({
    where: { id, collection: { userId: user.id } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const body = await req.json();
  const { approved, featured } = body;

  const video = await prisma.video.update({
    where: { id },
    data: {
      ...(approved !== undefined && { approved }),
      ...(featured !== undefined && { featured }),
    },
  });

  return NextResponse.json(video);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma: prismaClient } = await import("@/lib/prisma");

  const existing = await prismaClient.video.findFirst({
    where: { id, collection: { userId: user.id } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Delete from Mux if asset exists
  if (existing.muxAssetId) {
    try {
      await mux.video.assets.delete(existing.muxAssetId);
    } catch {
      // Asset may already be deleted on Mux side
    }
  }

  await prismaClient.video.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
