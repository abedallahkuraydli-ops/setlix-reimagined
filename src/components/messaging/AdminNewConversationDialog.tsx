import { useEffect, useMemo, useState } from "react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type ClientOption = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
};

const fullName = (p: ClientOption) =>
  p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Client";

type Props = {
  adminProfileId: string;
  onCreated: (conversationId: string) => void;
};

export function AdminNewConversationDialog({ adminProfileId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("profiles")
      .select("id, full_name, first_name, last_name, user_id")
      .order("full_name", { ascending: true })
      .then(async ({ data }) => {
        const all = (data ?? []) as (ClientOption & { user_id: string })[];
        if (all.length === 0) {
          setClients([]);
          return;
        }
        // Exclude staff (admin/superadmin) profiles
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", all.map((p) => p.user_id));
        const staff = new Set(
          (roles ?? [])
            .filter((r) => r.role === "admin" || r.role === "superadmin")
            .map((r) => r.user_id),
        );
        setClients(all.filter((p) => !staff.has(p.user_id)));
      });
  }, [open]);

  const selected = useMemo(
    () => clients.find((c) => c.id === clientId) ?? null,
    [clients, clientId],
  );

  const submit = async () => {
    const text = body.trim();
    if (!text || !clientId) return;
    setSubmitting(true);
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({ client_id: clientId, subject: subject.trim() || null })
      .select("id")
      .single();
    if (error || !conv) {
      setSubmitting(false);
      toast({
        title: "Could not start conversation",
        description: error?.message,
        variant: "destructive",
      });
      return;
    }
    const { error: msgErr } = await supabase
      .from("messages")
      .insert({ conversation_id: conv.id, sender_id: adminProfileId, body: text });
    setSubmitting(false);
    if (msgErr) {
      toast({
        title: "Could not send message",
        description: msgErr.message,
        variant: "destructive",
      });
      return;
    }
    setSubject("");
    setBody("");
    setClientId(null);
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
          <DialogTitle>New message to a client</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {selected ? fullName(selected) : "Select a client…"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search clients…" />
                  <CommandList>
                    <CommandEmpty>No clients found.</CommandEmpty>
                    <CommandGroup>
                      {clients.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={fullName(c)}
                          onSelect={() => {
                            setClientId(c.id);
                            setPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              clientId === c.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {fullName(c)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-subject">Subject (optional)</Label>
            <Input
              id="admin-subject"
              placeholder="What is this about?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-body">Message</Label>
            <Textarea
              id="admin-body"
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
          <Button onClick={submit} disabled={!body.trim() || !clientId || submitting}>
            {submitting ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
