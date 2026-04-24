import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageThread, type Message } from "@/components/messaging/MessageThread";
import { NewConversationDialog } from "@/components/messaging/NewConversationDialog";
import { relativeTime } from "@/lib/time";
import { MessageSquare } from "lucide-react";

type Conversation = {
  id: string;
  subject: string | null;
  status: "open" | "closed";
  last_message_at: string;
  client_id: string;
};

const PortalMessages = () => {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("You");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [previews, setPreviews] = useState<Record<string, Message | undefined>>({});
  const [unreadByConv, setUnreadByConv] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Load profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("id, full_name, first_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfileId(data.id);
          setProfileName(data.full_name || data.first_name || "You");
        }
      });
  }, [user]);

  // Load conversations + subscribe
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;

    const refresh = async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, subject, status, last_message_at, client_id")
        .eq("client_id", profileId)
        .order("last_message_at", { ascending: false });
      if (cancelled) return;
      const list = (convs ?? []) as Conversation[];
      setConversations(list);

      if (list.length === 0) {
        setPreviews({});
        setUnreadByConv({});
        return;
      }
      const ids = list.map((c) => c.id);
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false });
      const prev: Record<string, Message | undefined> = {};
      const unread: Record<string, number> = {};
      for (const m of (msgs ?? []) as Message[]) {
        if (!prev[m.conversation_id]) prev[m.conversation_id] = m;
        if (!m.read && m.sender_id !== profileId) {
          unread[m.conversation_id] = (unread[m.conversation_id] ?? 0) + 1;
        }
      }
      setPreviews(prev);
      setUnreadByConv(unread);
    };

    refresh();

    const channel = supabase
      .channel("portal-conv-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refresh)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  if (!profileId) {
    return (
      <div className="p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversation list */}
      <aside
        className={`${
          selected ? "hidden md:flex" : "flex"
        } w-full md:w-80 border-r border-border flex-col bg-card`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Messages</h1>
            <p className="text-xs text-muted-foreground">Chat with the Setlix team</p>
          </div>
          <NewConversationDialog clientProfileId={profileId} onCreated={(id) => setSelectedId(id)} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No messages yet — send us a message and we'll get back to you shortly.
            </div>
          ) : (
            conversations.map((c) => {
              const preview = previews[c.id];
              const unread = unreadByConv[c.id] ?? 0;
              const isSelected = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors ${
                    isSelected ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-sm truncate ${
                        unread > 0 ? "font-bold text-foreground" : "font-medium text-foreground"
                      }`}
                    >
                      {c.subject || "General Enquiry"}
                    </span>
                    {unread > 0 && <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground truncate">
                      {preview ? preview.body.slice(0, 60) : "No messages"}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {relativeTime(c.last_message_at)}
                    </span>
                  </div>
                  {c.status === "closed" && (
                    <span className="inline-block mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Closed
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Thread */}
      <section className={`${selected ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0 bg-background`}>
        {selected ? (
          <>
            <div className="border-b border-border p-4 flex items-center gap-3">
              <button
                className="md:hidden text-sm text-muted-foreground"
                onClick={() => setSelectedId(null)}
              >
                ← Back
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-foreground truncate">
                  {selected.subject || "General Enquiry"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selected.status === "closed" ? "Closed" : "Open"} · with Setlix
                </p>
              </div>
            </div>
            <MessageThread
              conversationId={selected.id}
              myProfileId={profileId}
              clientProfileId={selected.client_id}
              status={selected.status}
              isAdmin={false}
              nameById={{ [profileId]: profileName }}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default PortalMessages;
