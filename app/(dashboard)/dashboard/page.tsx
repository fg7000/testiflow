import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FolderOpen, Video, CheckCircle } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let collectionCount = 0;
  let videoCount = 0;
  let approvedCount = 0;

  try {
    const { prisma } = await import("@/lib/prisma");
    [collectionCount, videoCount, approvedCount] = await Promise.all([
      prisma.collection.count({ where: { userId: user!.id } }),
      prisma.video.count({
        where: { collection: { userId: user!.id } },
      }),
      prisma.video.count({
        where: { collection: { userId: user!.id }, approved: true },
      }),
    ]);
  } catch (e) {
    console.error("Failed to load dashboard stats:", e);
  }

  const stats = [
    {
      name: "Collections",
      value: collectionCount,
      icon: FolderOpen,
      description: "Active testimonial collections",
    },
    {
      name: "Total Videos",
      value: videoCount,
      icon: Video,
      description: "Testimonials received",
    },
    {
      name: "Approved",
      value: approvedCount,
      icon: CheckCircle,
      description: "Ready to share",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your video testimonials
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <CardDescription>{stat.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
