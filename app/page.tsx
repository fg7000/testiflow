import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Video, ArrowRight, CheckCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-xl font-bold">
            <Video className="h-6 w-6 text-primary" />
            TestiFlow
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 items-center">
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Collect video testimonials{" "}
            <span className="text-primary">effortlessly</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Your clients click a link, record a video, and you get a polished
            testimonial. No signups. No downloads. No friction.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/login">
                Start collecting
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Features */}
          <div className="mt-24 grid gap-8 text-left sm:grid-cols-3">
            {[
              {
                title: "Zero friction for clients",
                description:
                  "No accounts, no apps. Clients click a link, record, and submit. Done.",
              },
              {
                title: "Professional quality",
                description:
                  "Videos are automatically transcoded and optimized for any device and screen size.",
              },
              {
                title: "Full control",
                description:
                  "Review, approve, and embed testimonials on your website with a simple code snippet.",
              },
            ].map((feature) => (
              <div key={feature.title} className="space-y-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>TestiFlow — Video testimonials, simplified.</p>
      </footer>
    </div>
  );
}
