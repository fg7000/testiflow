"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Video {
  id: string;
  approved: boolean;
  featured: boolean;
  status: string;
}

export function VideoActions({
  video,
  showLabels = false,
}: {
  video: Video;
  showLabels?: boolean;
}) {
  const router = useRouter();

  async function updateVideo(data: Record<string, boolean>) {
    const res = await fetch(`/api/videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      toast.error("Failed to update video");
      return;
    }

    toast.success("Video updated");
    router.refresh();
  }

  async function deleteVideo() {
    if (!confirm("Are you sure you want to delete this video?")) return;

    const res = await fetch(`/api/videos/${video.id}`, { method: "DELETE" });

    if (!res.ok) {
      toast.error("Failed to delete video");
      return;
    }

    toast.success("Video deleted");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      {video.status === "READY" && (
        <>
          <Button
            variant={video.approved ? "default" : "outline"}
            size={showLabels ? "sm" : "icon"}
            onClick={() => updateVideo({ approved: !video.approved })}
            title={video.approved ? "Unapprove" : "Approve"}
          >
            {video.approved ? (
              <XCircle className={showLabels ? "mr-2 h-4 w-4" : "h-4 w-4"} />
            ) : (
              <CheckCircle className={showLabels ? "mr-2 h-4 w-4" : "h-4 w-4"} />
            )}
            {showLabels && (video.approved ? "Unapprove" : "Approve")}
          </Button>
          <Button
            variant={video.featured ? "default" : "outline"}
            size={showLabels ? "sm" : "icon"}
            onClick={() => updateVideo({ featured: !video.featured })}
            title={video.featured ? "Unfeature" : "Feature"}
          >
            <Star className={showLabels ? "mr-2 h-4 w-4" : "h-4 w-4"} />
            {showLabels && (video.featured ? "Unfeature" : "Feature")}
          </Button>
        </>
      )}
      <Button
        variant="outline"
        size={showLabels ? "sm" : "icon"}
        onClick={deleteVideo}
        title="Delete"
        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
      >
        <Trash2 className={showLabels ? "mr-2 h-4 w-4" : "h-4 w-4"} />
        {showLabels && "Delete"}
      </Button>
    </div>
  );
}
