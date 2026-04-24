import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Lock } from "lucide-react";
import { timeOfDay, relativeTime } from "@/lib/time";
import { toast } from "@/hooks/use-toast";

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read: boolean;
  created_at: string;
};

type Props = {
  conversationId: string;
  myProfileId: string;
  clientProfileId: string; // who the client is in this conversation
  status: "open" | "closed";
  isAdmin: boolean;
  /** Map profile id -> display name, used to label messages. */
  nameById?: Record<string, string>;
};

export function MessageThread({
  conversationId,
  myProfileId,
  clientProfileId,
  status,
  isAdmin,
  nameById = {},
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load + subscribe
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (!cancelled && !error && data) setMessages(data as Message[]);
    };
    load();

    const channel = supabase
      .channel(`thread-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) =>
            prev.find((m) => m.id === (payload.new as Message).id) ? prev : [...prev, payload.new as Message],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => prev.map((m) => (m.id === (payload.new as Message).id ? (payload.new as Message) : m)));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Mark unread incoming messages as read when admin (or client) opens the thread
  useEffect(() => {
    const unreadFromOther = messages.filter((m) => !m.read && m.sender_id !== myProfileId);
    if (unreadFromOther.length === 0) return;
    const ids = unreadFromOther.map((m) => m.id);
    supabase
      .from("messages")
      .update({ read: true })
      .in("id", ids)
      .then(({ error }) => {
        if (!error) {
          setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, read: true } : m)));
        }
      });
  }, [messages, myProfileId]);

  const send = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: myProfileId,
      body: text,
    });
    setSending(false);
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
      return;
    }
    setBody("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const closed = status === "closed";

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No messages yet.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === myProfileId;
            const name = nameById[m.sender_id] ?? (m.sender_id === clientProfileId ? "Client" : "Setlix");
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <span className="text-[11px] text-muted-foreground mb-1 px-1">
                    {name} · {timeOfDay(m.created_at)} · {relativeTime(m.created_at)}
                  </span>
                  <div
                    className={`rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {closed ? (
        <div className="border-t border-border bg-muted/40 p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          {isAdmin
            ? "This conversation is closed. Reopen it to reply."
            : "This conversation has been closed by Setlix. Start a new message if you need further help."}
        </div>
      ) : (
        <div className="border-t border-border p-3 md:p-4 flex gap-2 items-end bg-background">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="resize-none max-h-40"
          />
          <Button onClick={send} disabled={!body.trim() || sending} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
