"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
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
import { ArrowLeft, Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Collection {
  id: string;
  name: string;
  slug: string;
  welcomeMessage: string | null;
  promptQuestions: string[];
  brandColor: string;
  maxDuration: number;
  isActive: boolean;
}

export default function CollectionSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [collection, setCollection] = useState<Collection | null>(null);

  const [name, setName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [maxDuration, setMaxDuration] = useState(120);
  const [isActive, setIsActive] = useState(true);
  const [promptQuestions, setPromptQuestions] = useState<string[]>([]);
  const [newPrompt, setNewPrompt] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/collections/${id}`);
      if (!res.ok) {
        toast.error("Collection not found");
        router.push("/dashboard/collections");
        return;
      }
      const data = await res.json();
      setCollection(data);
      setName(data.name);
      setWelcomeMessage(data.welcomeMessage || "");
      setBrandColor(data.brandColor);
      setMaxDuration(data.maxDuration);
      setIsActive(data.isActive);
      setPromptQuestions(data.promptQuestions);
      setLoading(false);
    }
    load();
  }, [id, router]);

  function addPrompt() {
    if (newPrompt.trim()) {
      setPromptQuestions([...promptQuestions, newPrompt.trim()]);
      setNewPrompt("");
    }
  }

  function removePrompt(index: number) {
    setPromptQuestions(promptQuestions.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          welcomeMessage: welcomeMessage || null,
          promptQuestions,
          brandColor,
          maxDuration,
          isActive,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Collection updated!");
      router.push(`/dashboard/collections/${id}`);
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure? This will delete all videos in this collection.")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Collection deleted");
      router.push("/dashboard/collections");
    } catch {
      toast.error("Failed to delete collection");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/collections/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">{collection?.name}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Collection Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcome">Welcome Message</Label>
              <Textarea
                id="welcome"
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
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="active">
                Collection is active (accepting new testimonials)
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Deleting..." : "Delete Collection"}
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" type="button" asChild>
              <Link href={`/dashboard/collections/${id}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
