import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { FileText, Upload, Building2, Trash2, Download, Loader2, AlertCircle, ShieldCheck, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, computeSha256, formatBytes, logAudit, retentionLabel, validateFile } from "@/lib/documents";

interface DocRecord {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  category: string;
  created_at: string;
}

interface DocRequest {
  id: string;
  document_name: string;
  description: string | null;
  required: boolean;
  uploaded_file_url: string | null;
  uploaded_at: string | null;
  service_id: string | null;
  client_service?: { service_catalogue?: { name: string } | null } | null;
}

// formatBytes imported from @/lib/documents

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const Documents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploads, setUploads] = useState<DocRecord[]>([]);
  const [issued, setIssued] = useState<DocRecord[]>([]);
  const [docRequests, setDocRequests] = useState<DocRequest[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingRequestId, setUploadingRequestId] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    if (!user) return;

    // Get profile id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profile) setProfileId(profile.id);

    const [docsRes, reqRes] = await Promise.all([
      supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      profile
        ? supabase
            .from("document_requests")
            .select("*, client_services:service_id(service_catalogue(name))")
            .eq("client_id", profile.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    if (docsRes.data) {
      setUploads(docsRes.data.filter((d: DocRecord) => d.category === "client_upload"));
      setIssued(docsRes.data.filter((d: DocRecord) => d.category === "setlix_issued"));
    }
    if (reqRes.data) setDocRequests(reqRes.data as any);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const err = validateFile(file);
    if (err) {
      toast({ title: err, variant: "destructive" });
      e.target.value = "";
      return;
    }
    setUploading(true);
    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const sha256 = await computeSha256(file);
    const { error: storageError } = await supabase.storage
      .from("documents")
      .upload(filePath, file, { contentType: file.type });
    if (storageError) {
      toast({ title: "Upload failed", description: storageError.message, variant: "destructive" });
      setUploading(false);
      e.target.value = "";
      return;
    }
    const { data: insertedDoc, error: dbError } = await supabase.from("documents").insert({
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      category: "client_upload",
      mime_type: file.type,
      sha256_hash: sha256,
    }).select("id").single();
    if (dbError) toast({ title: "Error saving record", description: dbError.message, variant: "destructive" });
    else {
      toast({ title: "Document uploaded" });
      await logAudit({
        action: "upload",
        actor_role: "client",
        actor_user_id: user.id,
        target_user_id: user.id,
        document_id: insertedDoc?.id ?? null,
        file_path: filePath,
        file_name: file.name,
        metadata: { size: file.size, mime: file.type, sha256 },
      });
      fetchDocs();
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (doc: DocRecord) => {
    if (!user) return;
    await supabase.storage.from("documents").remove([doc.file_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    await logAudit({
      action: "delete",
      actor_role: "client",
      actor_user_id: user.id,
      target_user_id: user.id,
      document_id: doc.id,
      file_path: doc.file_path,
      file_name: doc.file_name,
    });
    toast({ title: "Document deleted" });
    fetchDocs();
  };

  const handleDownload = async (filePath: string, fileName?: string, documentId?: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(filePath, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Download failed", variant: "destructive" });
      return;
    }
    if (user) {
      await logAudit({
        action: "download",
        actor_role: "client",
        actor_user_id: user.id,
        target_user_id: user.id,
        document_id: documentId ?? null,
        file_path: filePath,
        file_name: fileName ?? null,
      });
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = fileName || "document";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRequestUpload = async (requestId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profileId) return;
    const err = validateFile(file);
    if (err) {
      toast({ title: err, variant: "destructive" });
      e.target.value = "";
      return;
    }
    setUploadingRequestId(requestId);
    const filePath = `${user.id}/requests/${Date.now()}_${file.name}`;
    const { error: storageError } = await supabase.storage
      .from("documents")
      .upload(filePath, file, { contentType: file.type });
    if (storageError) {
      toast({ title: "Upload failed", description: storageError.message, variant: "destructive" });
      setUploadingRequestId(null);
      e.target.value = "";
      return;
    }
    const { error: dbError } = await supabase
      .from("document_requests")
      .update({ uploaded_file_url: filePath, uploaded_at: new Date().toISOString(), uploaded_by: profileId })
      .eq("id", requestId);
    if (dbError) toast({ title: "Error updating", description: dbError.message, variant: "destructive" });
    else {
      toast({ title: "Document uploaded" });
      await logAudit({
        action: "upload",
        actor_role: "client",
        actor_user_id: user.id,
        target_user_id: user.id,
        document_request_id: requestId,
        file_path: filePath,
        file_name: file.name,
      });
      fetchDocs();
    }
    setUploadingRequestId(null);
    e.target.value = "";
  };

  // Group doc requests by service
  const grouped = docRequests.reduce<Record<string, DocRequest[]>>((acc, dr) => {
    const key = (dr as any).client_services?.service_catalogue?.name || "General Documents";
    (acc[key] = acc[key] || []).push(dr);
    return acc;
  }, {});

  const DocRow = ({ doc, showDelete }: { doc: DocRecord; showDelete?: boolean }) => (
    <div className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
      <div className="rounded-lg bg-muted p-2 shrink-0"><FileText className="h-5 w-5 text-primary" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(doc.file_size)} · {formatDate(doc.created_at)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => handleDownload(doc.file_path, doc.file_name, doc.id)} title="Download">
          <Download className="h-4 w-4" />
        </Button>
        {showDelete && (
          <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} title="Delete" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Documents</h1>
        <p className="text-muted-foreground text-sm mt-1">Access your files, agreements, and reports.</p>
      </div>

      <div className="space-y-6">
        {/* Requested Documents */}
        {docRequests.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Requested Documents</h2>
            </div>
            {Object.entries(grouped).map(([groupName, requests]) => (
              <div key={groupName} className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{groupName}</p>
                <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
                  {requests.map((dr) => (
                    <div key={dr.id} className="flex items-center gap-3 p-4">
                      <div className="rounded-lg bg-muted p-2 shrink-0"><FileText className="h-5 w-5 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{dr.document_name}</p>
                          <Badge variant={dr.required ? "default" : "secondary"} className="text-[10px]">
                            {dr.required ? "Required" : "Optional"}
                          </Badge>
                        </div>
                        {dr.description && <p className="text-xs text-muted-foreground mt-0.5">{dr.description}</p>}
                        {dr.uploaded_file_url ? (
                          <p className="text-xs text-emerald-600 font-medium mt-1">
                            Uploaded ✓ {dr.uploaded_at ? `· ${formatDate(dr.uploaded_at)}` : ""}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-600 font-medium mt-1">Awaiting upload</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {dr.uploaded_file_url ? (
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(dr.uploaded_file_url!, dr.document_name, undefined)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        ) : (
                          <label>
                            <input
                              type="file"
                              accept={ALLOWED_EXTENSIONS}
                              className="hidden"
                              onChange={(e) => handleRequestUpload(dr.id, e)}
                              disabled={uploadingRequestId === dr.id}
                            />
                            <Button asChild size="sm" variant="outline" disabled={uploadingRequestId === dr.id}>
                              <span className="cursor-pointer">
                                {uploadingRequestId === dr.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4 mr-1" />
                                )}
                                Upload
                              </span>
                            </Button>
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {docRequests.length === 0 && !loading && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Requested Documents</h2>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-4 mb-4"><FileText className="h-8 w-8 text-muted-foreground" /></div>
                <h3 className="text-base font-semibold text-foreground mb-1">No documents requested yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm text-center">
                  Check back soon — documents requested by Setlix will appear here.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Your Uploads */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Your Uploads</h2>
            </div>
            <label>
              <input type="file" accept={ALLOWED_EXTENSIONS} className="hidden" onChange={handleUpload} disabled={uploading} />
              <Button asChild size="sm" disabled={uploading}>
                <span className="cursor-pointer">
                  {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                  Upload
                </span>
              </Button>
            </label>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : uploads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-4 mb-4"><Upload className="h-8 w-8 text-muted-foreground" /></div>
                <h3 className="text-base font-semibold text-foreground mb-1">No uploads yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm text-center">Upload PDF documents to share them with the Setlix team.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">{uploads.map((doc) => <DocRow key={doc.id} doc={doc} showDelete />)}</div>
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
            <AlertCircle className="h-3 w-3" /> PDF, images (JPG/PNG/WEBP), or Office files (DOC/DOCX/XLS/XLSX). Max 25 MB.
          </p>
        </div>

        {/* Issued by Setlix */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Issued by Setlix</h2>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : issued.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-4 mb-4"><FileText className="h-8 w-8 text-muted-foreground" /></div>
                <h3 className="text-base font-semibold text-foreground mb-1">No documents issued yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm text-center">
                  Agreements, reports, and other documents issued by Setlix will appear here once your services are active.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">{issued.map((doc) => <DocRow key={doc.id} doc={doc} />)}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documents;
