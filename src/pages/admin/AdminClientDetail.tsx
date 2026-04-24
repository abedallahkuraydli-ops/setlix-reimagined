import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { ArrowLeft, Plus, Trash2, Download, Loader2, Upload, FileText, CheckCircle2, RotateCcw, Lock } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { ALLOWED_EXTENSIONS, computeSha256, formatBytes, logAudit, validateFile } from "@/lib/documents";
import { AdminContractSection } from "@/components/admin/AdminContractSection";
import { AdminInvoicesSection } from "@/components/admin/AdminInvoicesSection";
import { UnauthorisedDownloadDialog } from "@/components/admin/UnauthorisedDownloadDialog";
import { AdminDownloadPurposeDialog } from "@/components/admin/AdminDownloadPurposeDialog";
import { fetchAuthorisedDocIds, logUnauthorisedAttempt } from "@/lib/adminDownloads";
import type { Database } from "@/integrations/supabase/types";

type ServiceStatus = Database["public"]["Enums"]["service_status"];

const STATUS_PROGRESS: Record<ServiceStatus, number> = {
  requested: 0,
  in_review: 20,
  in_progress: 50,
  awaiting_client: 75,
  completed: 100,
};

interface Profile {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  phone_number: string | null;
  nif: string | null;
  onboarding_completed: boolean;
  created_at: string;
  user_id: string;
  lifecycle_status: "active" | "completed";
}

interface ClientService {
  id: string;
  status: ServiceStatus;
  progress_percentage: number;
  notes: string | null;
  price_cents: number | null;
  quantity: number;
  vat_rate: number | null;
  payment_status: string;
  service_catalogue: { id: string; name: string; category: string; price_cents: number | null; vat_rate: number } | null;
}

interface DocRequest {
  id: string;
  document_name: string;
  description: string | null;
  required: boolean;
  uploaded_file_url: string | null;
  uploaded_at: string | null;
  service_id: string | null;
}

interface CatalogueItem {
  id: string;
  name: string;
  category: string;
}

const statusOptions: { value: ServiceStatus; label: string }[] = [
  { value: "requested", label: "Requested" },
  { value: "in_review", label: "In Review" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_client", label: "Awaiting Client" },
  { value: "completed", label: "Completed" },
];

interface ClientDoc {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  category: string;
  created_at: string;
  user_id: string;
}

const AdminClientDetail = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperadmin, isOnlyAdmin } = useRole();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [services, setServices] = useState<ClientService[]>([]);
  const [docRequests, setDocRequests] = useState<DocRequest[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [clientUploads, setClientUploads] = useState<ClientDoc[]>([]);
  const [issuedDocs, setIssuedDocs] = useState<ClientDoc[]>([]);
  const [uploadingIssued, setUploadingIssued] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorisedDocIds, setAuthorisedDocIds] = useState<Set<string>>(new Set());
  const [unauthDialogOpen, setUnauthDialogOpen] = useState(false);
  const [unauthDocName, setUnauthDocName] = useState<string | null>(null);
  const [purposeDialogOpen, setPurposeDialogOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<
    | { kind: "client_doc"; doc: ClientDoc }
    | { kind: "doc_request"; doc: DocRequest }
    | null
  >(null);

  // Load this admin's authorised doc ids (superadmins skip)
  useEffect(() => {
    if (!user || isSuperadmin) return;
    fetchAuthorisedDocIds(user.id).then(setAuthorisedDocIds);
  }, [user, isSuperadmin]);

  const canDownload = (docId: string) => isSuperadmin || authorisedDocIds.has(docId);

  const guardedDownload = async (doc: ClientDoc) => {
    if (!canDownload(doc.id)) {
      setUnauthDocName(doc.file_name);
      setUnauthDialogOpen(true);
      if (user) {
        await logUnauthorisedAttempt({
          adminUserId: user.id,
          clientProfileId: profile?.id ?? null,
          documentId: doc.id,
          documentName: doc.file_name,
        });
      }
      return;
    }
    setPendingDownload({ kind: "client_doc", doc });
    setPurposeDialogOpen(true);
  };

  const requestPurposeAndDownloadDocRequest = (doc: DocRequest) => {
    setPendingDownload({ kind: "doc_request", doc });
    setPurposeDialogOpen(true);
  };

  const executePendingDownload = async (purpose: string) => {
    if (!pendingDownload) return;
    if (pendingDownload.kind === "client_doc") {
      await handleDownloadClientDoc(pendingDownload.doc, purpose);
    } else {
      await handleDownloadDoc(pendingDownload.doc, purpose);
    }
    setPendingDownload(null);
  };

  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [selectedCatalogueIds, setSelectedCatalogueIds] = useState<string[]>([]);

  const [addDocOpen, setAddDocOpen] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocDesc, setNewDocDesc] = useState("");
  const [newDocServiceId, setNewDocServiceId] = useState<string>("");
  const [newDocRequired, setNewDocRequired] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!clientId) return;

    const [profileRes, servicesRes, docsRes, catRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", clientId).single(),
      supabase.from("client_services").select("id, status, progress_percentage, notes, price_cents, quantity, vat_rate, payment_status, service_catalogue:service_catalogue_id(id, name, category, price_cents, vat_rate)").eq("client_id", clientId),
      supabase.from("document_requests").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("service_catalogue").select("id, name, category").eq("active", true).order("category"),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data as Profile);
      // Fetch documents stored under that user_id
      const { data: clientDocs } = await supabase
        .from("documents")
        .select("id, file_name, file_path, file_size, category, created_at, user_id")
        .eq("user_id", profileRes.data.user_id)
        .order("created_at", { ascending: false });
      if (clientDocs) {
        setClientUploads(clientDocs.filter((d) => d.category === "client_upload"));
        setIssuedDocs(clientDocs.filter((d) => d.category === "setlix_issued"));
      }
    }
    if (servicesRes.data) setServices(servicesRes.data as any);
    if (docsRes.data) setDocRequests(docsRes.data);
    if (catRes.data) setCatalogue(catRes.data);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime: react to changes on this client's services
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`admin-client-services-${clientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_services", filter: `client_id=eq.${clientId}` },
        () => { fetchAll(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, fetchAll]);

  const updateServiceField = async (serviceId: string, field: string, value: string | number | null) => {
    const updateData: Record<string, string | number | null> = { [field]: value };
    if (field === "status" && typeof value === "string" && value in STATUS_PROGRESS) {
      updateData.progress_percentage = STATUS_PROGRESS[value as ServiceStatus];
    }
    const { error } = await supabase.from("client_services").update(updateData as any).eq("id", serviceId);
    if (error) toast({ title: "Update failed", variant: "destructive" });
    else fetchAll();
  };

  const addServices = async () => {
    if (!clientId || selectedCatalogueIds.length === 0) return;
    const inserts = selectedCatalogueIds.map((scId) => ({
      client_id: clientId,
      service_catalogue_id: scId,
    }));
    const { error } = await supabase.from("client_services").insert(inserts);
    if (error) toast({ title: "Failed to add service", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Service(s) added" });
      setAddServiceOpen(false);
      setSelectedCatalogueIds([]);
      fetchAll();
    }
  };

  const setLifecycle = async (newStatus: "active" | "completed") => {
    if (!clientId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ lifecycle_status: newStatus })
      .eq("id", clientId);
    if (error) {
      toast({ title: "Failed to update client status", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: newStatus === "completed" ? "Client marked as completed" : "Client moved back to active",
        description: newStatus === "completed" ? "All services have been set to completed." : undefined,
      });
      fetchAll();
    }
  };

  const removeService = async (id: string) => {
    await supabase.from("client_services").delete().eq("id", id);
    toast({ title: "Service removed" });
    fetchAll();
  };

  const addDocRequest = async () => {
    if (!clientId || !newDocName.trim()) return;
    const { error } = await supabase.from("document_requests").insert({
      client_id: clientId,
      document_name: newDocName.trim(),
      description: newDocDesc.trim() || null,
      service_id: newDocServiceId || null,
      required: newDocRequired,
    });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Document request created" });
      setAddDocOpen(false);
      setNewDocName("");
      setNewDocDesc("");
      setNewDocServiceId("");
      setNewDocRequired(true);
      fetchAll();
    }
  };

  const deleteDocRequest = async (id: string) => {
    await supabase.from("document_requests").delete().eq("id", id);
    toast({ title: "Document request deleted" });
    fetchAll();
  };

  const handleDownloadDoc = async (doc: DocRequest, purpose: string) => {
    if (!doc.uploaded_file_url) return;
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.uploaded_file_url, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Download failed", variant: "destructive" });
      return;
    }
    if (user) {
      await logAudit({
        action: "admin_download",
        actor_role: "admin",
        actor_user_id: user.id,
        target_user_id: profile?.user_id ?? null,
        document_request_id: doc.id,
        file_path: doc.uploaded_file_url,
        file_name: doc.document_name,
        download_purpose: purpose,
      });
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDownloadClientDoc = async (doc: ClientDoc, purpose: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Download failed", variant: "destructive" });
      return;
    }
    if (user) {
      await logAudit({
        action: "admin_download",
        actor_role: "admin",
        actor_user_id: user.id,
        target_user_id: doc.user_id,
        document_id: doc.id,
        file_path: doc.file_path,
        file_name: doc.file_name,
        download_purpose: purpose,
      });
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = doc.file_name;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleIssuedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile) return;
    const err = validateFile(file);
    if (err) {
      toast({ title: err, variant: "destructive" });
      e.target.value = "";
      return;
    }
    setUploadingIssued(true);
    const filePath = `${profile.user_id}/issued/${Date.now()}_${file.name}`;
    const sha256 = await computeSha256(file);
    const { error: storageError } = await supabase.storage
      .from("documents")
      .upload(filePath, file, { contentType: file.type });
    if (storageError) {
      toast({ title: "Upload failed", description: storageError.message, variant: "destructive" });
      setUploadingIssued(false);
      e.target.value = "";
      return;
    }
    // Resolve admin profile id
    const { data: adminProfile } = await supabase
      .from("profiles").select("id").eq("user_id", user.id).single();
    const { data: insertedDoc, error: dbError } = await supabase.from("documents").insert({
      user_id: profile.user_id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      category: "setlix_issued",
      mime_type: file.type,
      uploaded_by_admin_id: adminProfile?.id ?? null,
      sha256_hash: sha256,
    }).select("id").single();
    if (dbError) {
      toast({ title: "Error saving record", description: dbError.message, variant: "destructive" });
    } else {
      toast({ title: "Document issued to client" });
      await logAudit({
        action: "admin_upload",
        actor_role: "admin",
        actor_user_id: user.id,
        target_user_id: profile.user_id,
        document_id: insertedDoc?.id ?? null,
        file_path: filePath,
        file_name: file.name,
        metadata: { size: file.size, mime: file.type, sha256 },
      });
      fetchAll();
    }
    setUploadingIssued(false);
    e.target.value = "";
  };

  const handleDeleteIssued = async (doc: ClientDoc) => {
    if (!user) return;
    await supabase.storage.from("documents").remove([doc.file_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    await logAudit({
      action: "admin_delete",
      actor_role: "admin",
      actor_user_id: user.id,
      target_user_id: doc.user_id,
      document_id: doc.id,
      file_path: doc.file_path,
      file_name: doc.file_name,
    });
    toast({ title: "Document deleted" });
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-muted-foreground">Client not found.</div>
    );
  }

  const assignedCatIds = new Set(services.map((s) => s.service_catalogue?.id));
  const availableCatalogue = catalogue.filter((c) => !assignedCatIds.has(c.id));

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/clients")} className="text-muted-foreground -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Clients
      </Button>

      <section className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Client Profile</h2>
            <Badge
              variant={profile.lifecycle_status === "completed" ? "default" : "secondary"}
              className={profile.lifecycle_status === "completed" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0" : ""}
            >
              {profile.lifecycle_status === "completed" ? "Completed" : "In the Works"}
            </Badge>
          </div>
          {profile.lifecycle_status === "completed" ? (
            <Button variant="outline" size="sm" onClick={() => setLifecycle("active")}>
              <RotateCcw className="h-4 w-4 mr-2" /> Move back to In the Works
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Mark as Completed
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mark client as completed?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will move the client to the Completed category and automatically set all their services to Completed (100% progress). The client will see all services marked as completed in their portal.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => setLifecycle("completed")}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Field label="Full Name" value={profile.full_name} />
          <Field label="Date of Birth" value={profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString("en-GB") : null} />
          <Field label="Nationality" value={profile.nationality} />
          <Field label="Phone" value={profile.phone_number} />
          <NifField
            value={profile.nif}
            canEdit={isSuperadmin}
            onSave={async (newNif) => {
              const { error } = await supabase
                .from("profiles")
                .update({ nif: newNif || null })
                .eq("id", profile.id);
              if (error) {
                toast({ title: "Failed to save NIF", description: error.message, variant: "destructive" });
              } else {
                toast({ title: newNif ? "NIF saved" : "NIF cleared" });
                fetchAll();
              }
            }}
          />
          <Field label="Signed Up" value={new Date(profile.created_at).toLocaleDateString("en-GB")} />
          <Field label="Onboarding" value={profile.onboarding_completed ? "Completed ✓" : "Pending"} />
        </div>
      </section>

      {/* Contract */}
      <AdminContractSection
        clientProfileId={profile.id}
        clientUserId={profile.user_id}
        clientName={profile.full_name || profile.first_name || "this client"}
      />

      {/* Invoices & Payments */}
      <AdminInvoicesSection clientId={profile.id} clientUserId={profile.user_id} />

      <section className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Services</h2>
          <Dialog open={addServiceOpen} onOpenChange={setAddServiceOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Service</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Service</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {availableCatalogue.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All services already assigned.</p>
                ) : (
                  availableCatalogue.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCatalogueIds.includes(c.id)}
                        onChange={(e) => {
                          setSelectedCatalogueIds((prev) =>
                            e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                          );
                        }}
                        className="rounded"
                      />
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.category}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <Button onClick={addServices} disabled={selectedCatalogueIds.length === 0} className="w-full mt-2">
                Add Selected
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No services assigned yet.</p>
        ) : (
          <div className="space-y-4">
            {services.map((s) => {
              const effectivePrice = s.price_cents ?? s.service_catalogue?.price_cents ?? 0;
              const effectiveVat = s.vat_rate ?? s.service_catalogue?.vat_rate ?? 23;
              return (
              <div key={s.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{s.service_catalogue?.name}</p>
                      <Badge
                        variant={s.payment_status === "paid" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {s.payment_status === "paid" ? "Paid" : s.payment_status === "not_required" ? "No charge" : s.payment_status === "refunded" ? "Refunded" : "Unpaid"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.service_catalogue?.category}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={s.payment_status}
                      onValueChange={(v) => updateServiceField(s.id, "payment_status", v)}
                    >
                      <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue placeholder="Payment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Mark Unpaid</SelectItem>
                        <SelectItem value="paid">Mark Paid</SelectItem>
                        <SelectItem value="not_required">No charge</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeService(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                    <Select value={s.status} onValueChange={(v) => updateServiceField(s.id, "status", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Progress ({s.progress_percentage}%)</Label>
                    <div className="flex items-center h-9">
                      <Progress value={s.progress_percentage} className="h-2 flex-1" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Auto-updated by status</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Price (€, incl. VAT)</Label>
                    <Input
                      type="number" min="0" step="0.01"
                      defaultValue={(effectivePrice / 100).toFixed(2)}
                      onBlur={(e) => {
                        const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                        if (cents !== effectivePrice) updateServiceField(s.id, "price_cents", cents);
                      }}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Quantity</Label>
                    <Input
                      type="number" min="1" step="1"
                      defaultValue={s.quantity}
                      onBlur={(e) => {
                        const q = Math.max(1, parseInt(e.target.value) || 1);
                        if (q !== s.quantity) updateServiceField(s.id, "quantity", q);
                      }}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">VAT %</Label>
                    <Select
                      value={String(effectiveVat)}
                      onValueChange={(v) => updateServiceField(s.id, "vat_rate", parseFloat(v))}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0% (Isento)</SelectItem>
                        <SelectItem value="6">6% (Reduzida)</SelectItem>
                        <SelectItem value="13">13% (Intermédia)</SelectItem>
                        <SelectItem value="23">23% (Normal)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>


                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Notes</Label>
                  <Textarea
                    defaultValue={s.notes || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (s.notes || "")) {
                        updateServiceField(s.id, "notes", e.target.value || null);
                      }
                    }}
                    placeholder="Internal notes…"
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Document Requests</h2>
          <Dialog open={addDocOpen} onOpenChange={setAddDocOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Request</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Document Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Document Name</Label>
                  <Input value={newDocName} onChange={(e) => setNewDocName(e.target.value)} placeholder="e.g. Passport Copy" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={newDocDesc} onChange={(e) => setNewDocDesc(e.target.value)} placeholder="Instructions for the client…" rows={2} />
                </div>
                <div>
                  <Label>Linked Service (optional)</Label>
                  <Select value={newDocServiceId} onValueChange={setNewDocServiceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.service_catalogue?.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newDocRequired} onCheckedChange={setNewDocRequired} />
                  <Label>Required</Label>
                </div>
                <Button onClick={addDocRequest} disabled={!newDocName.trim()} className="w-full">Create Request</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {docRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No document requests yet.</p>
        ) : (
          <div className="space-y-3">
            {docRequests.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-4 border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{doc.document_name}</p>
                    <Badge variant={doc.required ? "default" : "secondary"} className="text-[10px]">
                      {doc.required ? "Required" : "Optional"}
                    </Badge>
                  </div>
                  {doc.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
                  )}
                  <p className="text-xs mt-1">
                    {doc.uploaded_file_url ? (
                      <span className="text-emerald-600 font-medium">
                        Uploaded ✓ {doc.uploaded_at ? `· ${new Date(doc.uploaded_at).toLocaleDateString("en-GB")}` : ""}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">Awaiting upload</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {doc.uploaded_file_url && (
                    <Button variant="ghost" size="icon" onClick={() => requestPurposeAndDownloadDocRequest(doc)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocRequest(doc.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Client Uploads */}
      <section className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Client Uploads</h2>
        {clientUploads.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No documents uploaded by client yet.</p>
        ) : (
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {clientUploads.map((doc) => {
              const allowed = canDownload(doc.id);
              return (
              <div key={doc.id} className="flex items-center gap-3 p-3 hover:bg-muted/40">
                <div className="rounded-lg bg-muted p-2 shrink-0"><FileText className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                    {doc.file_name}
                    {allowed && !isSuperadmin && (
                      <Download className="h-3 w-3 text-emerald-600" aria-label="Download authorised" />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => guardedDownload(doc)}
                  title={allowed ? "Download" : "Download not authorised"}
                >
                  {allowed ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Issued by Setlix */}
      <section className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Issued to Client</h2>
          <label>
            <input
              type="file"
              accept={ALLOWED_EXTENSIONS}
              className="hidden"
              onChange={handleIssuedUpload}
              disabled={uploadingIssued}
            />
            <Button asChild size="sm" disabled={uploadingIssued}>
              <span className="cursor-pointer">
                {uploadingIssued ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Upload Document
              </span>
            </Button>
          </label>
        </div>
        {issuedDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No documents issued to this client yet.</p>
        ) : (
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {issuedDocs.map((doc) => {
              const allowed = canDownload(doc.id);
              return (
              <div key={doc.id} className="flex items-center gap-3 p-3 hover:bg-muted/40">
                <div className="rounded-lg bg-muted p-2 shrink-0"><FileText className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                    {doc.file_name}
                    {allowed && !isSuperadmin && (
                      <Download className="h-3 w-3 text-emerald-600" aria-label="Download authorised" />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => guardedDownload(doc)}
                  title={allowed ? "Download" : "Download not authorised"}
                >
                  {allowed ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                </Button>
                {isSuperadmin && (
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteIssued(doc)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          PDF, images, or Office files (max 25 MB). The client will see these instantly in their portal under "Issued by Setlix".
        </p>
      </section>

      <UnauthorisedDownloadDialog
        open={unauthDialogOpen}
        onOpenChange={setUnauthDialogOpen}
        documentName={unauthDocName}
      />
      <AdminDownloadPurposeDialog
        open={purposeDialogOpen}
        onOpenChange={setPurposeDialogOpen}
        documentName={
          pendingDownload?.kind === "client_doc"
            ? pendingDownload.doc.file_name
            : pendingDownload?.kind === "doc_request"
              ? pendingDownload.doc.document_name
              : null
        }
        onConfirm={executePendingDownload}
      />
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string | null }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium text-foreground">{value || "—"}</p>
  </div>
);

const NifField = ({
  value,
  canEdit,
  onSave,
}: {
  value: string | null;
  canEdit: boolean;
  onSave: (nif: string) => Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const commit = async () => {
    const clean = draft.replace(/\D/g, "");
    if (clean && !/^\d{9}$/.test(clean)) return;
    setSaving(true);
    await onSave(clean);
    setSaving(false);
    setEditing(false);
  };

  if (!canEdit) {
    return <Field label="NIF" value={value} />;
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">NIF</p>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 9))}
            placeholder="9 digits"
            inputMode="numeric"
            maxLength={9}
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={commit} disabled={saving || (draft.length > 0 && draft.length !== 9)}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setDraft(value ?? ""); setEditing(false); }}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{value || "—"}</p>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
            {value ? "Edit" : "Add"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminClientDetail;
