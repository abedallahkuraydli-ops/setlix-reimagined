import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  description: string | null;
  position: number;
  doc_count?: number;
}

interface Props {
  clientId: string;
  onChanged?: () => void;
}

export const AdminDocumentCategoriesSection = ({ clientId, onChanged }: Props) => {
  const { toast } = useToast();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: catData } = await supabase
      .from("document_categories")
      .select("id, name, description, position")
      .eq("client_id", clientId)
      .order("position", { ascending: true })
      .order("name", { ascending: true });

    const list = (catData ?? []) as Category[];
    if (list.length) {
      const { data: docs } = await supabase
        .from("documents")
        .select("category_id")
        .in("category_id", list.map((c) => c.id));
      const counts: Record<string, number> = {};
      (docs ?? []).forEach((d: { category_id: string | null }) => {
        if (d.category_id) counts[d.category_id] = (counts[d.category_id] ?? 0) + 1;
      });
      list.forEach((c) => (c.doc_count = counts[c.id] ?? 0));
    }
    setCats(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [clientId]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setDescription("");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description ?? "");
    setOpen(true);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("document_categories")
          .update({ name: trimmed, description: description.trim() || null })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const nextPos = (cats[cats.length - 1]?.position ?? 0) + 1;
        const { error } = await supabase.from("document_categories").insert({
          client_id: clientId,
          name: trimmed,
          description: description.trim() || null,
          position: nextPos,
        });
        if (error) throw error;
      }
      setOpen(false);
      resetForm();
      await load();
      onChanged?.();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"? Documents will remain but become uncategorised.`)) return;
    const { error } = await supabase.from("document_categories").delete().eq("id", c.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      await load();
      onChanged?.();
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Document Categories</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Superadmin-only. Group this client's documents so they can download a whole category at once.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> New Category
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : cats.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No categories yet. Create one to start classifying this client's documents.
        </p>
      ) : (
        <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 hover:bg-muted/40">
              <div className="rounded-lg bg-muted p-2 shrink-0">
                <FolderOpen className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                {c.description && (
                  <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                )}
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {c.doc_count ?? 0} {c.doc_count === 1 ? "doc" : "docs"}
              </Badge>
              <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => remove(c)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fiscal, Immigration, Personal ID"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description (optional)</Label>
              <Textarea
                id="cat-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
