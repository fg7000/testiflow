import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const collectionId = searchParams.get("collectionId");

  const videos = await prisma.video.findMany({
    where: {
      collection: { userId: user.id },
      ...(collectionId && { collectionId }),
    },
    include: { collection: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(videos);
}

// Public endpoint — called after client uploads video to Mux
export async function POST(req: Request) {
  const body = await req.json();
  const { collectionId, clientName, clientEmail, clientCompany, muxUploadId } =
    body;

  if (!collectionId || !clientName || !muxUploadId) {
    return NextResponse.json(
      { error: "collectionId, clientName, and muxUploadId are required" },
      { status: 400 }
    );
  }

  // Verify collection exists and is active
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });

  if (!collection || !collection.isActive) {
    return NextResponse.json(
      { error: "Collection not found or inactive" },
      { status: 404 }
    );
  }

  const video = await prisma.video.create({
    data: {
      collectionId,
      clientName,
      clientEmail: clientEmail || null,
      clientCompany: clientCompany || null,
      muxUploadId,
      status: "UPLOADING",
    },
  });

  return NextResponse.json(video, { status: 201 });
}
