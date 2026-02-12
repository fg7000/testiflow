import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Settings,
  Code,
  Copy,
  ExternalLink,
  Video,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  AlertCircle,
} from "lucide-react";
import { VideoActions } from "@/components/dashboard/video-actions";
import { ShareLink } from "@/components/dashboard/share-link";
import { InviteDialog } from "@/components/dashboard/invite-dialog";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let collection;
  try {
    const { prisma } = await import("@/lib/prisma");
    collection = await prisma.collection.findFirst({
      where: { id, userId: user!.id },
      include: {
        videos: { orderBy: { createdAt: "desc" } },
      },
    });
  } catch (e) {
    console.error("Failed to load collection:", e);
  }

  if (!collection) {
    notFound();
  }

  const statusIcon: Record<string, React.ReactNode> = {
    READY: <CheckCircle className="h-4 w-4 text-green-500" />,
    PROCESSING: <Clock className="h-4 w-4 text-yellow-500" />,
    UPLOADING: <Clock className="h-4 w-4 text-blue-500" />,
    PENDING: <Clock className="h-4 w-4 text-muted-foreground" />,
    ERRORED: <XCircle className="h-4 w-4 text-destructive" />,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/collections">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {collection.name}
              </h1>
              <Badge variant={collection.isActive ? "default" : "secondary"}>
                {collection.isActive ? "Active" : "Paused"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">/c/{collection.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InviteDialog collectionId={collection.id} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/collections/${id}/embed`}>
              <Code className="mr-2 h-4 w-4" />
              Embed
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/collections/${id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Share Link */}
      <ShareLink slug={collection.slug} />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{collection.videos.length}</div>
            <p className="text-sm text-muted-foreground">Total Videos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {collection.videos.filter((v) => v.status === "READY").length}
            </div>
            <p className="text-sm text-muted-foreground">Ready</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {collection.videos.filter((v) => v.approved).length}
            </div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {collection.videos.filter((v) => v.featured).length}
            </div>
            <p className="text-sm text-muted-foreground">Featured</p>
          </CardContent>
        </Card>
      </div>

      {/* Videos Grid */}
      {collection.videos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No videos yet</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Share your collection link with clients to start receiving
              testimonials.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collection.videos.map((video) => (
            <Card key={video.id} className="overflow-hidden">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-muted">
                {video.thumbnailUrl ? (
                  <Image
                    src={video.thumbnailUrl}
                    alt={`Testimonial by ${video.clientName}`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    {video.status === "ERRORED" ? (
                      <AlertCircle className="h-8 w-8 text-destructive" />
                    ) : (
                      <Video className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                )}
                {video.featured && (
                  <div className="absolute left-2 top-2">
                    <Badge className="bg-yellow-500 text-white">
                      <Star className="mr-1 h-3 w-3" />
                      Featured
                    </Badge>
                  </div>
                )}
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{video.clientName}</CardTitle>
                  <div className="flex items-center gap-1">
                    {statusIcon[video.status]}
                    <span className="text-xs text-muted-foreground">
                      {video.status.toLowerCase()}
                    </span>
                  </div>
                </div>
                {video.clientCompany && (
                  <CardDescription>{video.clientCompany}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {video.duration && (
                      <span>{Math.round(video.duration)}s</span>
                    )}
                    <span>
                      {new Date(video.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {video.status === "READY" && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/videos/${video.id}`}>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    )}
                    <VideoActions video={video} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
