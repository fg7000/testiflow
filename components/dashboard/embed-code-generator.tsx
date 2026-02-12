"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Copy, Check } from "lucide-react";

interface Video {
  id: string;
  clientName: string;
  muxPlaybackId: string | null;
}

export function EmbedCodeGenerator({
  videos,
  appUrl,
}: {
  videos: Video[];
  appUrl: string;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyCode(id: string, code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-4">
      {videos.map((video) => {
        if (!video.muxPlaybackId) return null;

        const iframeCode = `<iframe src="https://stream.mux.com/${video.muxPlaybackId}" style="aspect-ratio: 16/9; width: 100%; border: none; border-radius: 8px;" allow="autoplay; fullscreen" allowfullscreen></iframe>`;

        return (
          <Card key={video.id}>
            <CardHeader>
              <CardTitle className="text-base">{video.clientName}</CardTitle>
              <CardDescription>
                Copy the embed code below and paste it into your website.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {iframeCode}
              </pre>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyCode(video.id, iframeCode)}
              >
                {copiedId === video.id ? (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copiedId === video.id ? "Copied!" : "Copy Code"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
