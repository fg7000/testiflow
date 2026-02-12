import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Star } from "lucide-react";
import { VideoPlayer } from "@/components/dashboard/video-player";
import { VideoActions } from "@/components/dashboard/video-actions";

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const video = await prisma.video.findFirst({
    where: { id, collection: { userId: user!.id } },
    include: { collection: true },
  });

  if (!video) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/collections/${video.collectionId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {video.clientName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {video.collection.name}
          </p>
        </div>
      </div>

      {/* Video Player */}
      {video.muxPlaybackId && video.status === "READY" ? (
        <VideoPlayer playbackId={video.muxPlaybackId} />
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-24">
            <p className="text-muted-foreground">
              {video.status === "PROCESSING"
                ? "Video is being processed..."
                : video.status === "ERRORED"
                ? "Video processing failed"
                : "Video not yet available"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Name: </span>
              {video.clientName}
            </div>
            {video.clientEmail && (
              <div>
                <span className="text-muted-foreground">Email: </span>
                {video.clientEmail}
              </div>
            )}
            {video.clientCompany && (
              <div>
                <span className="text-muted-foreground">Company: </span>
                {video.clientCompany}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Video Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status: </span>
              <Badge
                variant={
                  video.status === "READY"
                    ? "default"
                    : video.status === "ERRORED"
                    ? "destructive"
                    : "secondary"
                }
              >
                {video.status.toLowerCase()}
              </Badge>
            </div>
            {video.duration && (
              <div>
                <span className="text-muted-foreground">Duration: </span>
                {Math.round(video.duration)}s
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Submitted: </span>
              {new Date(video.createdAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2">
              {video.approved && <Badge variant="default">Approved</Badge>}
              {video.featured && (
                <Badge className="bg-yellow-500 text-white">
                  <Star className="mr-1 h-3 w-3" />
                  Featured
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <VideoActions video={video} showLabels />
        </CardContent>
      </Card>
    </div>
  );
}
