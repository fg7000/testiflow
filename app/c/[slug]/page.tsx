import { notFound } from "next/navigation";
import { RecordingPage } from "@/components/recording/recording-page";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { prisma } = await import("@/lib/prisma");
    const collection = await prisma.collection.findUnique({
      where: { slug },
      select: { name: true },
    });
    return {
      title: collection ? `Record a Testimonial — ${collection.name}` : "Not Found",
      description: "Record a quick video testimonial. No signup required.",
    };
  } catch {
    return {
      title: "Record a Testimonial",
      description: "Record a quick video testimonial. No signup required.",
    };
  }
}

export default async function PublicRecordPage({ params }: Props) {
  const { slug } = await params;

  let collection;
  try {
    const { prisma } = await import("@/lib/prisma");
    collection = await prisma.collection.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        welcomeMessage: true,
        promptQuestions: true,
        logoUrl: true,
        brandColor: true,
        maxDuration: true,
        isActive: true,
      },
    });
  } catch (e) {
    console.error("Failed to load collection:", e);
  }

  if (!collection || !collection.isActive) {
    notFound();
  }

  return <RecordingPage collection={collection} />;
}
