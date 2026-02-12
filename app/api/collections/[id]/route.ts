import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

  const { prisma } = await import("@/lib/prisma");
  const collection = await prisma.collection.findFirst({
    where: { id, userId: user.id },
    include: {
      videos: { orderBy: { createdAt: "desc" } },
      _count: { select: { videos: true } },
    },
  });

  if (!collection) {
    return NextResponse.json(
      { error: "Collection not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(collection);
}

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

  // Verify ownership
  const existing = await prisma.collection.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Collection not found" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const { name, welcomeMessage, promptQuestions, brandColor, maxDuration, isActive } = body;

  const collection = await prisma.collection.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(welcomeMessage !== undefined && { welcomeMessage }),
      ...(promptQuestions !== undefined && { promptQuestions }),
      ...(brandColor !== undefined && { brandColor }),
      ...(maxDuration !== undefined && { maxDuration }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(collection);
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

  const existing = await prismaClient.collection.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Collection not found" },
      { status: 404 }
    );
  }

  await prismaClient.collection.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
