"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, Plus, X } from "lucide-react";
import { toast } from "sonner";

export function InviteDialog({ collectionId }: { collectionId: string }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [emails, setEmails] = useState<string[]>([""]);

  function addEmailField() {
    setEmails([...emails, ""]);
  }

  function updateEmail(index: number, value: string) {
    const updated = [...emails];
    updated[index] = value;
    setEmails(updated);
  }

  function removeEmail(index: number) {
    if (emails.length === 1) return;
    setEmails(emails.filter((_, i) => i !== index));
  }

  async function handleSend() {
    const validEmails = emails.filter((e) => e.trim() && e.includes("@"));
    if (validEmails.length === 0) {
      toast.error("Please enter at least one valid email");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, emails: validEmails }),
      });

      if (!res.ok) throw new Error("Failed to send invitations");

      const data = await res.json();
      toast.success(`Sent ${data.sent} invitation${data.sent !== 1 ? "s" : ""}`);
      if (data.failed > 0) {
        toast.error(`${data.failed} invitation${data.failed !== 1 ? "s" : ""} failed`);
      }
      setOpen(false);
      setEmails([""]);
    } catch {
      toast.error("Failed to send invitations");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="mr-2 h-4 w-4" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Invitations</DialogTitle>
          <DialogDescription>
            Send your clients an email with a link to record their testimonial.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email Addresses</Label>
            {emails.map((email, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={email}
                  onChange={(e) => updateEmail(i, e.target.value)}
                />
                {emails.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEmail(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addEmailField}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add another email
            </Button>
          </div>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="w-full"
          >
            {sending ? "Sending..." : "Send Invitations"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
