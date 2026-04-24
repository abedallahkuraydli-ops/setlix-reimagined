import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Props = {
  clientProfileId: string;
  onCreated: (conversationId: string) => void;
};

export function NewConversationDialog({ clientProfileId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    setSubmitting(true);
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({ client_id: clientProfileId, subject: subject.trim() || null })
      .select("id")
      .single();
    if (error || !conv) {
      setSubmitting(false);
      toast({ title: "Could not start conversation", description: error?.message, variant: "destructive" });
      return;
    }
    const { error: msgErr } = await supabase
      .from("messages")
      .insert({ conversation_id: conv.id, sender_id: clientProfileId, body: text });
    setSubmitting(false);
    if (msgErr) {
      toast({ title: "Could not send message", description: msgErr.message, variant: "destructive" });
      return;
    }
    setSubject("");
    setBody("");
    setOpen(false);
    onCreated(conv.id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> New
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject (optional)</Label>
            <Input
              id="subject"
              placeholder="What is this about?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              placeholder="Write your message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!body.trim() || submitting}>
            {submitting ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
