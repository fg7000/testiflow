import { NextResponse } from "next/server";
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(req: Request) {
  const body = await req.json();
  const { collectionId } = body;

  if (!collectionId) {
    return NextResponse.json(
      { error: "collectionId is required" },
      { status: 400 }
    );
  }

  const upload = await mux.video.uploads.create({
    cors_origin: process.env.NEXT_PUBLIC_APP_URL || "*",
    new_asset_settings: {
      playback_policy: ["public"],
      encoding_tier: "baseline",
    },
  });

  return NextResponse.json({
    uploadUrl: upload.url,
    uploadId: upload.id,
  });
}
