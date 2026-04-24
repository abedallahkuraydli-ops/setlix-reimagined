import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageThread, type Message } from "@/components/messaging/MessageThread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { relativeTime } from "@/lib/time";
import { MessageSquare, Search, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Conversation = {
  id: string;
  subject: string | null;
  status: "open" | "closed";
  last_message_at: string;
  client_id: string;
  admin_id: string | null;
  client?: { id: string; full_name: string | null; first_name: string | null; last_name: string | null };
};

type Filter = "all" | "open" | "closed" | "unread";

const fullName = (p?: Conversation["client"]) =>
  p ? p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Client" : "Client";

const AdminMessages = () => {
  const { user } = useAuth();
  const [adminProfileId, setAdminProfileId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [previews, setPreviews] = useState<Record<string, Message | undefined>>({});
  const [unreadByConv, setUnreadByConv] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  // Load admin profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => data && setAdminProfileId(data.id));
  }, [user]);

  // Load conversations + subscribe
  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select(
          "id, subject, status, last_message_at, client_id, admin_id, client:profiles!conversations_client_id_fkey(id, full_name, first_name, last_name)",
        )
        .order("last_message_at", { ascending: false });
      if (cancelled) return;
      const list = (convs ?? []) as unknown as Conversation[];
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
      const clientByConv = Object.fromEntries(list.map((c) => [c.id, c.client_id]));
      for (const m of (msgs ?? []) as Message[]) {
        if (!prev[m.conversation_id]) prev[m.conversation_id] = m;
        if (!m.read && m.sender_id === clientByConv[m.conversation_id]) {
          unread[m.conversation_id] = (unread[m.conversation_id] ?? 0) + 1;
        }
      }
      setPreviews(prev);
      setUnreadByConv(unread);
    };

    refresh();

    const channel = supabase
      .channel("admin-conv-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refresh)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === "open" && c.status !== "open") return false;
      if (filter === "closed" && c.status !== "closed") return false;
      if (filter === "unread" && (unreadByConv[c.id] ?? 0) === 0) return false;
      if (q) {
        const inName = fullName(c.client).toLowerCase().includes(q);
        const inSubject = (c.subject ?? "").toLowerCase().includes(q);
        const inPreview = (previews[c.id]?.body ?? "").toLowerCase().includes(q);
        if (!inName && !inSubject && !inPreview) return false;
      }
      return true;
    });
  }, [conversations, filter, search, previews, unreadByConv]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const assignToMe = async () => {
    if (!selected || !adminProfileId) return;
    const { error } = await supabase
      .from("conversations")
      .update({ admin_id: adminProfileId })
      .eq("id", selected.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else toast({ title: "Assigned to you" });
  };

  const toggleStatus = async () => {
    if (!selected) return;
    const next = selected.status === "open" ? "closed" : "open";
    const { error } = await supabase.from("conversations").update({ status: next }).eq("id", selected.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
  };

  if (!adminProfileId) {
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
        } w-full md:w-96 border-r border-border flex-col bg-card`}
      >
        <div className="p-4 border-b border-border space-y-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">Messages</h1>
            <p className="text-xs text-muted-foreground">All client conversations</p>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client or content"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No conversations</div>
          ) : (
            filtered.map((c) => {
              const preview = previews[c.id];
              const unread = unreadByConv[c.id] ?? 0;
              const isSelected = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors ${
                    isSelected ? "bg-muted" : unread > 0 ? "bg-amber-50/40 dark:bg-amber-950/10" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-sm truncate ${unread > 0 ? "font-bold" : "font-medium"} text-foreground`}>
                      {fullName(c.client)}
                    </span>
                    {unread > 0 && <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mb-1">
                    {c.subject || "General Enquiry"}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground truncate">
                      {preview ? preview.body.slice(0, 60) : "No messages"}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {relativeTime(c.last_message_at)}
                    </span>
                  </div>
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
            <div className="border-b border-border p-4 flex items-center gap-3 flex-wrap">
              <button
                className="md:hidden text-sm text-muted-foreground"
                onClick={() => setSelectedId(null)}
              >
                ← Back
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/admin/clients/${selected.client_id}`}
                    className="text-sm font-semibold text-foreground hover:underline inline-flex items-center gap-1"
                  >
                    {fullName(selected.client)}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {selected.status === "closed" ? "Closed" : "Open"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {selected.subject || "General Enquiry"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selected.admin_id !== adminProfileId && (
                  <Button size="sm" variant="outline" onClick={assignToMe}>
                    Assign to me
                  </Button>
                )}
                <Button size="sm" variant={selected.status === "open" ? "outline" : "default"} onClick={toggleStatus}>
                  {selected.status === "open" ? "Mark as closed" : "Reopen"}
                </Button>
              </div>
            </div>
            <MessageThread
              conversationId={selected.id}
              myProfileId={adminProfileId}
              clientProfileId={selected.client_id}
              status={selected.status}
              isAdmin
              nameById={{ [selected.client_id]: fullName(selected.client), [adminProfileId]: "You" }}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Select a conversation</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminMessages;
