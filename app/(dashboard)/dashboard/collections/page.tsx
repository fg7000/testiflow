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
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen } from "lucide-react";

export default async function CollectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const collections = await prisma.collection.findMany({
    where: { userId: user!.id },
    include: {
      _count: { select: { videos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground">
            Manage your testimonial collections
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/collections/new">
            <Plus className="mr-2 h-4 w-4" />
            New Collection
          </Link>
        </Button>
      </div>

      {collections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No collections yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first collection to start collecting testimonials.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/collections/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Collection
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/dashboard/collections/${collection.id}`}
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {collection.name}
                    </CardTitle>
                    <Badge variant={collection.isActive ? "default" : "secondary"}>
                      {collection.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <CardDescription>/c/{collection.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{collection._count.videos} videos</span>
                    <span>{collection.promptQuestions.length} prompts</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
