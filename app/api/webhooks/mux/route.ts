import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.text();

  // Verify webhook signature in production
  const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers.get("mux-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }
    // For production, use Mux.Webhooks.verifySignature()
    // For now, we proceed with basic handling
  }

  const event = JSON.parse(body);

  switch (event.type) {
    case "video.upload.asset_created": {
      const uploadId = event.data.id;
      const assetId = event.data.asset_id;
      await prisma.video.updateMany({
        where: { muxUploadId: uploadId },
        data: {
          muxAssetId: assetId,
          status: "PROCESSING",
        },
      });
      break;
    }

    case "video.asset.ready": {
      const asset = event.data;
      const playbackId = asset.playback_ids?.[0]?.id;

      await prisma.video.updateMany({
        where: { muxAssetId: asset.id },
        data: {
          status: "READY",
          muxPlaybackId: playbackId || null,
          duration: asset.duration || null,
          thumbnailUrl: playbackId
            ? `https://image.mux.com/${playbackId}/thumbnail.png`
            : null,
        },
      });
      break;
    }

    case "video.asset.errored": {
      await prisma.video.updateMany({
        where: { muxAssetId: event.data.id },
        data: { status: "ERRORED" },
      });
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
