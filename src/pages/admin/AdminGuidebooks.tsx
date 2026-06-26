import { useEffect, useState } from "react";
import { Upload, Trash2, Loader2, FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/documents";
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

interface Guidebook {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const AdminGuidebooks = () => {
  const [items, setItems] = useState<Guidebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("guidebooks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setItems((data ?? []) as Guidebook[]);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      toast({ title: "Missing fields", description: "Title and file are required.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: "File too large", description: "Maximum 50 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("guidebooks")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("guidebooks").insert({
        title: title.trim(),
        description: description.trim() || null,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by_user_id: user.id,
      });
      if (insErr) {
        await supabase.storage.from("guidebooks").remove([path]);
        throw insErr;
      }
      toast({ title: "Guidebook uploaded" });
      setTitle(""); setDescription(""); setFile(null);
      const input = document.getElementById("guidebook-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (g: Guidebook) => {
    try {
      await supabase.storage.from("guidebooks").remove([g.file_path]);
      const { error } = await supabase.from("guidebooks").delete().eq("id", g.id);
      if (error) throw error;
      toast({ title: "Guidebook deleted" });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast({ title: "Delete failed", description: msg, variant: "destructive" });
    }
  };

  const handleDownload = async (g: Guidebook) => {
    const { data, error } = await supabase.storage.from("guidebooks").download(g.file_path);
    if (error || !data) {
      toast({ title: "Download failed", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url; a.download = g.file_name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Guidebooks</h1>
        <p className="text-muted-foreground text-sm">
          Upload guidebooks that visitors can download from the public website.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Upload new guidebook</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <Label htmlFor="guidebook-title">Title</Label>
              <Input id="guidebook-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Moving to Portugal — Starter Guide" required />
            </div>
            <div>
              <Label htmlFor="guidebook-desc">Description (optional)</Label>
              <Textarea id="guidebook-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div>
              <Label htmlFor="guidebook-file">File (PDF, DOC, max 50 MB)</Label>
              <Input
                id="guidebook-file"
                type="file"
                accept=".pdf,.doc,.docx,.epub"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <Button type="submit" disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Published guidebooks</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No guidebooks yet.</p>
          ) : (
            <ul className="divide-y">
              {items.map((g) => (
                <li key={g.id} className="py-3 flex items-start gap-3">
                  <FileText className="w-5 h-5 text-primary shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{g.title}</p>
                    {g.description && <p className="text-sm text-muted-foreground line-clamp-2">{g.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {g.file_name} {g.file_size ? `• ${formatBytes(g.file_size)}` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(g)} title="Download">
                    <Download className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Delete">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this guidebook?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{g.title}" will be removed from the public website immediately. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(g)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGuidebooks;
