import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Flag,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  position: number;
  status: "pending" | "active" | "completed";
  categories: string[];
  completed_at: string | null;
}

interface ServiceLite {
  id: string;
  status: string;
  milestone_id: string | null;
  service_catalogue: { name: string; category: string } | null;
}

interface Props {
  clientId: string;
}

const CATEGORIES = [
  "Company Registration",
  "Administrative Services",
  "Administrative Support",
  "Financial Services",
  "Golden Visa",
  "Relocation Services",
  "Community & Networking",
  "Creative Services",
];

const emptyForm = { title: "", description: "", categories: [] as string[] };

export const AdminMilestonesSection = ({ clientId }: Props) => {
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [services, setServices] = useState<ServiceLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [m, s] = await Promise.all([
      (supabase as any)
        .from("client_milestones")
        .select("id, title, description, position, status, categories, completed_at")
        .eq("client_id", clientId)
        .order("position"),
      (supabase as any)
        .from("client_services")
        .select("id, status, milestone_id, service_catalogue:service_catalogue_id(name, category)")
        .eq("client_id", clientId),
    ]);
    setMilestones((m.data ?? []) as Milestone[]);
    setServices((s.data ?? []) as ServiceLite[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!clientId) return;
    load();
    const ch = supabase
      .channel(`admin-milestones-${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_milestones", filter: `client_id=eq.${clientId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_services", filter: `client_id=eq.${clientId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setAddOpen(true); };
  const openEdit = (m: Milestone) => {
    setEditing(m);
    setForm({ title: m.title, description: m.description ?? "", categories: m.categories ?? [] });
    setAddOpen(true);
  };

  const toggleCat = (c: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c],
    }));
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setBusy("save");
    if (editing) {
      const { error } = await (supabase as any)
        .from("client_milestones")
        .update({ title: form.title.trim(), description: form.description || null, categories: form.categories })
        .eq("id", editing.id);
      if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      const maxPos = milestones.reduce((mx, x) => Math.max(mx, x.position), -1);
      const isFirst = milestones.length === 0;
      const { error } = await (supabase as any)
        .from("client_milestones")
        .insert({
          client_id: clientId,
          title: form.title.trim(),
          description: form.description || null,
          categories: form.categories,
          position: maxPos + 1,
          status: isFirst ? "active" : "pending",
        });
      if (error) toast({ title: "Create failed", description: error.message, variant: "destructive" });
    }
    setBusy(null);
    setAddOpen(false);
    load();
  };

  const remove = async (m: Milestone) => {
    setBusy(m.id);
    await (supabase as any).from("client_milestones").delete().eq("id", m.id);
    setBusy(null);
    load();
  };

  const move = async (m: Milestone, dir: -1 | 1) => {
    const idx = milestones.findIndex((x) => x.id === m.id);
    const swap = milestones[idx + dir];
    if (!swap) return;
    setBusy(m.id);
    await (supabase as any).from("client_milestones").update({ position: swap.position }).eq("id", m.id);
    await (supabase as any).from("client_milestones").update({ position: m.position }).eq("id", swap.id);
    setBusy(null);
    load();
  };

  const complete = async (m: Milestone) => {
    setBusy(m.id);
    const { error } = await (supabase as any).rpc("complete_client_milestone", { _milestone_id: m.id });
    setBusy(null);
    if (error) {
      toast({ title: "Cannot complete milestone", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Milestone completed", description: "Next milestone is now active." });
    load();
  };

  const reassign = async (serviceId: string, milestoneId: string | null) => {
    await (supabase as any).from("client_services").update({ milestone_id: milestoneId }).eq("id", serviceId);
    load();
  };

  const unassigned = services.filter((s) => !s.milestone_id);

  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Milestones</h2>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add milestone</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit milestone" : "New milestone"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Company setup" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>Auto-assign categories</Label>
                <p className="text-xs text-muted-foreground mb-2">New services in these categories will land here automatically.</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.categories.includes(c)} onCheckedChange={() => toggleCat(c)} />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={save} disabled={busy === "save" || !form.title.trim()} className="w-full">
                {busy === "save" && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editing ? "Save changes" : "Create milestone"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No milestones yet. Add the first one to start tracking progress.</p>
      ) : (
        <div className="space-y-3">
          {milestones.map((m, idx) => {
            const rel = services.filter((s) => s.milestone_id === m.id);
            const done = rel.filter((s) => s.status === "completed").length;
            const canComplete = m.status !== "completed" && rel.length > 0 && done === rel.length;
            return (
              <div key={m.id} className={`border rounded-lg p-4 ${m.status === "active" ? "border-primary/40 bg-primary/5" : m.status === "completed" ? "border-emerald-300/40 bg-emerald-50/40 dark:bg-emerald-950/10" : "border-border"}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{idx + 1}. {m.title}</p>
                      {m.status === "active" && <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Active</Badge>}
                      {m.status === "completed" && <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">Completed</Badge>}
                      {m.status === "pending" && <Badge className="bg-muted text-muted-foreground border-0 text-[10px]">Pending</Badge>}
                    </div>
                    {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                    {m.categories.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1">Auto-assigns: {m.categories.join(", ")}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{done}/{rel.length} services completed</p>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Button size="icon" variant="ghost" onClick={() => move(m, -1)} disabled={idx === 0 || busy === m.id}><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => move(m, 1)} disabled={idx === milestones.length - 1 || busy === m.id}><ArrowDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete milestone?</AlertDialogTitle>
                          <AlertDialogDescription>Services in this milestone will become unassigned.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(m)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {m.status !== "completed" && (
                      <Button size="sm" onClick={() => complete(m)} disabled={!canComplete || busy === m.id} title={!canComplete ? "All services in this milestone must be completed first" : ""}>
                        {busy === m.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        Mark complete
                      </Button>
                    )}
                  </div>
                </div>

                {rel.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                    {rel.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <span className={`h-2 w-2 rounded-full ${s.status === "completed" ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span className="flex-1 truncate">{s.service_catalogue?.name}</span>
                        <Select value={m.id} onValueChange={(v) => reassign(s.id, v === "__none" ? null : v)}>
                          <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">Unassigned</SelectItem>
                            {milestones.map((mm) => (
                              <SelectItem key={mm.id} value={mm.id}>{mm.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {unassigned.length > 0 && (
            <div className="border border-dashed border-border rounded-lg p-4">
              <p className="text-sm font-semibold text-foreground mb-2">Unassigned services</p>
              <div className="space-y-2">
                {unassigned.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{s.service_catalogue?.name}</span>
                    <Select onValueChange={(v) => reassign(s.id, v)}>
                      <SelectTrigger className="h-7 w-40 text-xs"><SelectValue placeholder="Assign to..." /></SelectTrigger>
                      <SelectContent>
                        {milestones.map((mm) => (
                          <SelectItem key={mm.id} value={mm.id}>{mm.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AdminMilestonesSection;
