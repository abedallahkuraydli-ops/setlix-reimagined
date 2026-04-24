import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Loader2, ShieldCheck, Users, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
}

interface ClientProfile {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface ClientDoc {
  id: string;
  file_name: string;
  category: string;
  user_id: string;
  created_at: string;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const AdminManagement = () => {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newMeetLink, setNewMeetLink] = useState("");

  // permissions sheet
  const [permAdmin, setPermAdmin] = useState<AdminUser | null>(null);
  const [allClients, setAllClients] = useState<ClientProfile[]>([]);
  const [allocated, setAllocated] = useState<Set<string>>(new Set());
  const [docsByClient, setDocsByClient] = useState<Record<string, ClientDoc[]>>({});
  const [authorisedDocs, setAuthorisedDocs] = useState<Set<string>>(new Set());
  const [permLoading, setPermLoading] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-list-users");
    if (error) {
      toast({ title: "Failed to load admins", description: error.message, variant: "destructive" });
    } else {
      setAdmins(((data as any)?.admins ?? []) as AdminUser[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleCreate = async () => {
    if (!newEmail || newPwd.length < 8) {
      toast({ title: "Email and password (min 8 chars) required", variant: "destructive" });
      return;
    }
    if (!newCompany.trim()) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        email: newEmail,
        password: newPwd,
        full_name: newName || null,
        company_name: newCompany.trim(),
        meet_link: newMeetLink.trim() || null,
      },
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Failed to create admin",
        description: (data as any)?.error ?? error?.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Admin created", description: newEmail });
    setNewEmail(""); setNewPwd(""); setNewName(""); setNewCompany(""); setNewMeetLink("");
    setCreateOpen(false);
    fetchAdmins();
  };

  const handleDelete = async (a: AdminUser) => {
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { user_id: a.user_id },
    });
    if (error || (data as any)?.error) {
      toast({
        title: "Delete failed",
        description: (data as any)?.error ?? error?.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Admin removed" });
    fetchAdmins();
  };

  const openPermissions = async (a: AdminUser) => {
    setPermAdmin(a);
    setPermLoading(true);
    const [clientsRes, allocRes, docsRes, permRes] = await Promise.all([
      // Only client-role profiles (exclude admins/superadmins). Roles linked via user_id.
      supabase.from("profiles").select("id, full_name, first_name, last_name, user_id"),
      supabase.from("admin_client_allocations").select("client_profile_id").eq("admin_user_id", a.user_id),
      supabase.from("documents").select("id, file_name, category, user_id, created_at").order("created_at", { ascending: false }),
      supabase.from("document_download_permissions").select("document_id, authorised").eq("admin_user_id", a.user_id),
    ]);

    // Filter out non-client profiles by checking user_roles
    const profileUserIds = (clientsRes.data ?? []).map((p: any) => p.user_id);
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", profileUserIds);
    const clientUserIds = new Set(
      (rolesData ?? []).filter((r) => r.role === "client").map((r) => r.user_id),
    );
    const clientProfiles = (clientsRes.data ?? []).filter((p: any) => clientUserIds.has(p.user_id));
    setAllClients(clientProfiles as ClientProfile[]);

    setAllocated(new Set((allocRes.data ?? []).map((r) => r.client_profile_id as string)));

    // Group docs by their client profile id (via documents.user_id -> profile.user_id)
    const profileByUserId = new Map(clientProfiles.map((p: any) => [p.user_id, p.id]));
    const grouped: Record<string, ClientDoc[]> = {};
    (docsRes.data ?? []).forEach((d: any) => {
      const pid = profileByUserId.get(d.user_id);
      if (!pid) return;
      if (!grouped[pid]) grouped[pid] = [];
      grouped[pid].push(d);
    });
    setDocsByClient(grouped);

    setAuthorisedDocs(new Set(
      (permRes.data ?? []).filter((r) => r.authorised).map((r) => r.document_id as string),
    ));
    setPermLoading(false);
  };

  const toggleAllocation = async (clientProfileId: string, on: boolean) => {
    if (!permAdmin) return;
    if (on) {
      const { error } = await supabase.from("admin_client_allocations").insert({
        admin_user_id: permAdmin.user_id,
        client_profile_id: clientProfileId,
      });
      if (error) {
        toast({ title: "Failed", description: error.message, variant: "destructive" });
        return;
      }
      setAllocated((s) => new Set(s).add(clientProfileId));
    } else {
      const { error } = await supabase
        .from("admin_client_allocations")
        .delete()
        .eq("admin_user_id", permAdmin.user_id)
        .eq("client_profile_id", clientProfileId);
      if (error) {
        toast({ title: "Failed", description: error.message, variant: "destructive" });
        return;
      }
      setAllocated((s) => {
        const next = new Set(s); next.delete(clientProfileId); return next;
      });
    }
  };

  const toggleDocPermission = async (docId: string, on: boolean) => {
    if (!permAdmin) return;
    if (on) {
      const { error } = await supabase.from("document_download_permissions").upsert({
        admin_user_id: permAdmin.user_id,
        document_id: docId,
        authorised: true,
      }, { onConflict: "admin_user_id,document_id" });
      if (error) {
        toast({ title: "Failed", description: error.message, variant: "destructive" });
        return;
      }
      setAuthorisedDocs((s) => new Set(s).add(docId));
    } else {
      const { error } = await supabase
        .from("document_download_permissions")
        .delete()
        .eq("admin_user_id", permAdmin.user_id)
        .eq("document_id", docId);
      if (error) {
        toast({ title: "Failed", description: error.message, variant: "destructive" });
        return;
      }
      setAuthorisedDocs((s) => {
        const next = new Set(s); next.delete(docId); return next;
      });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Admin management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create view-only admins and control which clients and documents they can access.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New admin</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create admin account</DialogTitle>
              <DialogDescription>
                The new admin will be view-only with no client access until you allocate them.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Full name (optional)</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Company name *</Label>
                <Input
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="e.g. Partner Firm Lda"
                />
                <p className="text-xs text-muted-foreground">Shown to clients when they pick who their meeting is with.</p>
              </div>
              <div className="space-y-1">
                <Label>Google Meet link (optional)</Label>
                <Input
                  type="url"
                  value={newMeetLink}
                  onChange={(e) => setNewMeetLink(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij"
                />
                <p className="text-xs text-muted-foreground">Sent to clients in their appointment confirmation.</p>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Temporary password (min 8 chars)</Label>
                <Input type="text" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                <p className="text-xs text-muted-foreground">Share this with the admin securely. They should change it on first login.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No admin accounts yet. Click "New admin" to create one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last sign-in</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((a) => (
                <TableRow key={a.user_id}>
                  <TableCell className="font-medium">{a.email}</TableCell>
                  <TableCell>{a.full_name ?? "—"}</TableCell>
                  <TableCell>{fmt(a.created_at)}</TableCell>
                  <TableCell>{fmt(a.last_sign_in_at)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Sheet onOpenChange={(o) => !o && setPermAdmin(null)}>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => openPermissions(a)}>
                          <Users className="h-3.5 w-3.5 mr-1" /> Permissions
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                        <SheetHeader>
                          <SheetTitle>Permissions — {a.email}</SheetTitle>
                          <SheetDescription>
                            Toggle which clients this admin can view, then for each allocated client toggle which documents they can download. Everything is denied by default.
                          </SheetDescription>
                        </SheetHeader>
                        {permLoading ? (
                          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                        ) : (
                          <div className="mt-6 space-y-6">
                            <div>
                              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                <Users className="h-4 w-4" /> Client access
                              </h3>
                              <div className="border rounded divide-y max-h-[260px] overflow-y-auto">
                                {allClients.length === 0 ? (
                                  <div className="p-4 text-sm text-muted-foreground">No clients available.</div>
                                ) : allClients.map((c) => {
                                  const on = allocated.has(c.id);
                                  return (
                                    <label
                                      key={c.id}
                                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30"
                                    >
                                      <Checkbox checked={on} onCheckedChange={(v) => toggleAllocation(c.id, !!v)} />
                                      <span className="text-sm">
                                        {c.full_name || `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unnamed"}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Document download permissions
                              </h3>
                              <p className="text-xs text-muted-foreground mb-3">
                                Only documents from allocated clients can be authorised. All denied by default.
                              </p>
                              <div className="space-y-4">
                                {Array.from(allocated).length === 0 ? (
                                  <div className="text-sm text-muted-foreground border rounded p-4">
                                    Allocate a client first to see their documents.
                                  </div>
                                ) : Array.from(allocated).map((cid) => {
                                  const client = allClients.find((c) => c.id === cid);
                                  const docs = docsByClient[cid] ?? [];
                                  return (
                                    <div key={cid} className="border rounded">
                                      <div className="px-3 py-2 bg-muted/30 text-sm font-medium border-b">
                                        {client?.full_name || `${client?.first_name ?? ""} ${client?.last_name ?? ""}`.trim() || "Client"}
                                      </div>
                                      {docs.length === 0 ? (
                                        <div className="p-3 text-xs text-muted-foreground">No documents.</div>
                                      ) : docs.map((d) => {
                                        const on = authorisedDocs.has(d.id);
                                        return (
                                          <label key={d.id} className="flex items-center gap-3 p-3 border-t cursor-pointer hover:bg-muted/20">
                                            <Checkbox checked={on} onCheckedChange={(v) => toggleDocPermission(d.id, !!v)} />
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm truncate">{d.file_name}</div>
                                              <div className="text-[10px] text-muted-foreground">
                                                {d.category === "client_upload" ? "Client upload" : "Issued by Setlix"}
                                              </div>
                                            </div>
                                            {on && <Badge variant="default" className="text-[10px]">Authorised</Badge>}
                                          </label>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </SheetContent>
                    </Sheet>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove admin {a.email}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently deletes their account and all allocations. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(a)}>Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default AdminManagement;
