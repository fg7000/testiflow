import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const collection = await prisma.collection.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      welcomeMessage: true,
      promptQuestions: true,
      logoUrl: true,
      brandColor: true,
      maxDuration: true,
      isActive: true,
    },
  });

  if (!collection || !collection.isActive) {
    return NextResponse.json(
      { error: "Collection not found or inactive" },
      { status: 404 }
    );
  }

  return NextResponse.json(collection);
}
