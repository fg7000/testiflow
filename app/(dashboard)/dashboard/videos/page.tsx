import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  AlertCircle,
} from "lucide-react";
import { VideoActions } from "@/components/dashboard/video-actions";

export default async function VideosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let videos: any[] = [];

  try {
    const { prisma } = await import("@/lib/prisma");
    videos = await prisma.video.findMany({
      where: { collection: { userId: user!.id } },
      include: { collection: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("Failed to load videos:", e);
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Videos</h1>
        <p className="text-muted-foreground">
          All video testimonials across your collections
        </p>
      </div>

      {videos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No videos yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Videos will appear here once clients submit testimonials.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Card key={video.id} className="overflow-hidden">
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
                {video.collection && (
                  <CardDescription>{video.collection.name}</CardDescription>
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
                      <Link
                        href={`/dashboard/videos/${video.id}`}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted h-8 w-8"
                      >
                        <Video className="h-3 w-3" />
                      </Link>
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
