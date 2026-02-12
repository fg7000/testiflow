import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { EmbedCodeGenerator } from "@/components/dashboard/embed-code-generator";

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const collection = await prisma.collection.findFirst({
    where: { id, userId: user!.id },
    include: {
      videos: {
        where: { approved: true, status: "READY" },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!collection) {
    notFound();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/collections/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Embed Code</h1>
          <p className="text-muted-foreground">{collection.name}</p>
        </div>
      </div>

      {collection.videos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No approved videos to embed yet. Approve some videos first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <EmbedCodeGenerator
          videos={collection.videos}
          appUrl={appUrl}
        />
      )}
    </div>
  );
}
