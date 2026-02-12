"use client";

import MuxPlayer from "@mux/mux-player-react";

export function VideoPlayer({ playbackId }: { playbackId: string }) {
  return (
    <div className="overflow-hidden rounded-lg">
      <MuxPlayer
        playbackId={playbackId}
        accentColor="#6366f1"
        style={{ aspectRatio: "16/9", width: "100%" }}
      />
    </div>
  );
}
