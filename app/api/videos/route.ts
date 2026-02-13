import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");
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
  } catch (e) {
    console.error("Failed to load videos:", e);
    return NextResponse.json(
      { error: "Failed to load videos" },
      { status: 500 }
    );
  }
}

// Public endpoint — called after client uploads video to Mux
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { collectionId, clientName, clientEmail, clientCompany, muxUploadId } =
      body;

    if (!collectionId || !clientName || !muxUploadId) {
      return NextResponse.json(
        { error: "collectionId, clientName, and muxUploadId are required" },
        { status: 400 }
      );
    }

    const { prisma } = await import("@/lib/prisma");

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
  } catch (e) {
    console.error("Failed to create video:", e);
    return NextResponse.json(
      { error: "Failed to create video" },
      { status: 500 }
    );
  }
}
