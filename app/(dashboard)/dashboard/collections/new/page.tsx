"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewCollectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [maxDuration, setMaxDuration] = useState(120);
  const [promptQuestions, setPromptQuestions] = useState<string[]>([
    "What problem were you facing before working with us?",
    "How has our product/service helped you?",
    "What would you say to someone considering our product/service?",
  ]);
  const [newPrompt, setNewPrompt] = useState("");

  function addPrompt() {
    if (newPrompt.trim()) {
      setPromptQuestions([...promptQuestions, newPrompt.trim()]);
      setNewPrompt("");
    }
  }

  function removePrompt(index: number) {
    setPromptQuestions(promptQuestions.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          welcomeMessage: welcomeMessage || null,
          promptQuestions,
          brandColor,
          maxDuration,
        }),
      });

      if (!res.ok) {
        let errorMsg = "Failed to create collection";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch {
          // Response may not be JSON
        }
        throw new Error(errorMsg);
      }

      const collection = await res.json();
      toast.success("Collection created!");
      router.push(`/dashboard/collections/${collection.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/collections">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            New Collection
          </h1>
          <p className="text-muted-foreground">
            Set up a new testimonial collection
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
            <CardDescription>
              Name your collection and add a welcome message for your clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Collection Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Acme Corp Testimonials"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcome">Welcome Message</Label>
              <Textarea
                id="welcome"
                placeholder="Thanks for taking the time to record a testimonial! Just answer the questions below and share your honest experience."
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompt Questions</CardTitle>
            <CardDescription>
              These questions guide your clients on what to talk about.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {promptQuestions.map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm">{q}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => removePrompt(i)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Add a prompt question..."
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPrompt();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addPrompt}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Customize the look and behavior of your collection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Brand Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded border"
                  />
                  <Input
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-28"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Max Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  max={300}
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(Number(e.target.value))}
                  className="w-28"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/dashboard/collections">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? "Creating..." : "Create Collection"}
          </Button>
        </div>
      </form>
    </div>
  );
}
