import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    include: { _count: { select: { videos: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(collections);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, welcomeMessage, promptQuestions, brandColor, maxDuration } =
    body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Collection name is required" },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/prisma");

  // Generate unique slug
  let slug = nanoid(10);
  let existing = await prisma.collection.findUnique({ where: { slug } });
  while (existing) {
    slug = nanoid(10);
    existing = await prisma.collection.findUnique({ where: { slug } });
  }

  const collection = await prisma.collection.create({
    data: {
      userId: user.id,
      name: name.trim(),
      slug,
      welcomeMessage: welcomeMessage || null,
      promptQuestions: promptQuestions || [],
      brandColor: brandColor || "#6366f1",
      maxDuration: maxDuration || 120,
    },
  });

  return NextResponse.json(collection, { status: 201 });
}
