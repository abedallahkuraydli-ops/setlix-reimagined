import { useEffect, useState, useCallback } from "react";
import { FileSignature, Upload, Download, Loader2, CheckCircle2, Trash2, FileText, ShieldCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ALLOWED_EXTENSIONS, formatBytes, validateFile } from "@/lib/documents";
import { sealSignature, verifySignature, type SignaturePayload } from "@/lib/crypto";
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

interface ContractRow {
  id: string;
  client_id: string;
  status: "pending_signature" | "signed" | "superseded";
  contract_file_path: string;
  contract_file_name: string;
  contract_file_size: number | null;
  signature_method: string | null;
  signature_typed_name: string | null;
  signature_drawn_data_url: string | null;
  signed_file_path: string | null;
  signed_file_name: string | null;
  signed_at: string | null;
  signed_user_agent: string | null;
  marked_signed_at: string | null;
  signature_hash: string | null;
  sealed_at: string | null;
}

interface Props {
  clientProfileId: string;
  clientUserId: string;
  clientName: string;
}

export function AdminContractSection({ clientProfileId, clientUserId, clientName }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contract, setContract] = useState<ContractRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchContract = useCallback(async () => {
    const { data } = await supabase
      .from("contracts")
      .select("*")
      .eq("client_id", clientProfileId)
      .neq("status", "superseded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setContract((data as ContractRow) ?? null);
    setLoading(false);
  }, [clientProfileId]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    const err = validateFile(file);
    if (err) {
      toast({ title: "Invalid file", description: err, variant: "destructive" });
      return;
    }
    setUploading(true);
    const path = `contracts/${clientUserId}/contract-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (upErr) {
      setUploading(false);
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }

    // Supersede any existing contract
    if (contract) {
      await supabase.from("contracts").update({ status: "superseded" }).eq("id", contract.id);
    }

    const { error: insErr } = await supabase.from("contracts").insert({
      client_id: clientProfileId,
      uploaded_by_admin_id: user.id,
      contract_file_path: path,
      contract_file_name: file.name,
      contract_mime_type: file.type,
      contract_file_size: file.size,
      status: "pending_signature",
    });
    setUploading(false);
    if (insErr) {
      toast({ title: "Failed to save contract", description: insErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Contract uploaded", description: "Client has been notified to sign." });
    fetchContract();
  };

  const downloadFile = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (error || !data) {
      toast({ title: "Download failed", variant: "destructive" });
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.click();
  };

  const markSigned = async () => {
    if (!contract || !user) return;
    const signedAt = new Date().toISOString();
    const payload: SignaturePayload = {
      contract_id: contract.id,
      client_id: contract.client_id,
      contract_file_path: contract.contract_file_path,
      contract_file_name: contract.contract_file_name,
      signature_method: "admin_marked",
      signature_typed_name: null,
      signature_drawn_data_url: null,
      signed_file_path: null,
      signed_at: signedAt,
      signed_user_agent: `admin:${user.id}`,
    };
    const hash = await sealSignature(payload);
    const { error } = await supabase
      .from("contracts")
      .update({
        status: "signed",
        signature_method: "admin_marked",
        signed_at: signedAt,
        marked_signed_by_admin_id: user.id,
        marked_signed_at: signedAt,
        signature_hash: hash,
        sealed_at: signedAt,
      } as never)
      .eq("id", contract.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Marked as signed" });
    fetchContract();
  };

  const markSignedOutsidePortal = async () => {
    if (!user) return;
    const signedAt = new Date().toISOString();
    const { data: inserted, error: insErr } = await supabase
      .from("contracts")
      .insert({
        client_id: clientProfileId,
        uploaded_by_admin_id: user.id,
        contract_file_path: "",
        contract_file_name: "Signed outside portal",
        status: "pending_signature",
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      toast({ title: "Failed to create contract record", description: insErr?.message, variant: "destructive" });
      return;
    }
    const payload: SignaturePayload = {
      contract_id: inserted.id,
      client_id: clientProfileId,
      contract_file_path: "",
      contract_file_name: "Signed outside portal",
      signature_method: "admin_marked",
      signature_typed_name: null,
      signature_drawn_data_url: null,
      signed_file_path: null,
      signed_at: signedAt,
      signed_user_agent: `admin:${user.id}`,
    };
    const hash = await sealSignature(payload);
    const { error } = await supabase
      .from("contracts")
      .update({
        status: "signed",
        signature_method: "admin_marked",
        signed_at: signedAt,
        marked_signed_by_admin_id: user.id,
        marked_signed_at: signedAt,
        signature_hash: hash,
        sealed_at: signedAt,
      } as never)
      .eq("id", inserted.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Marked as signed outside portal", description: "Client services are now unblocked." });
    fetchContract();
  };

  const verifyIntegrity = async () => {
    if (!contract || !contract.signature_hash || !contract.signed_at) {
      toast({ title: "No seal to verify" });
      return;
    }
    const payload: SignaturePayload = {
      contract_id: contract.id,
      client_id: contract.client_id,
      contract_file_path: contract.contract_file_path,
      contract_file_name: contract.contract_file_name,
      signature_method: contract.signature_method ?? "",
      signature_typed_name: contract.signature_typed_name,
      signature_drawn_data_url: contract.signature_drawn_data_url,
      signed_file_path: contract.signed_file_path,
      signed_at: contract.signed_at,
      signed_user_agent: contract.signed_user_agent ?? (contract.signature_method === "admin_marked" ? `admin:${(contract as any).marked_signed_by_admin_id ?? ""}` : ""),
    };
    const ok = await verifySignature(payload, contract.signature_hash);
    toast({
      title: ok ? "Signature verified ✓" : "Integrity check FAILED",
      description: ok
        ? "The signed contract record matches its tamper-evident seal."
        : "The signature record has been altered since signing. Investigate immediately.",
      variant: ok ? "default" : "destructive",
    });
  };

  const reopenContract = async () => {
    if (!contract) return;
    const { error } = await supabase
      .from("contracts")
      .update({
        status: "pending_signature",
        signature_method: null,
        signature_typed_name: null,
        signature_drawn_data_url: null,
        signed_file_path: null,
        signed_file_name: null,
        signed_at: null,
        marked_signed_by_admin_id: null,
        marked_signed_at: null,
      })
      .eq("id", contract.id);
    if (error) {
      toast({ title: "Update failed", variant: "destructive" });
      return;
    }
    toast({ title: "Contract re-opened for signing" });
    fetchContract();
  };

  const deleteContract = async () => {
    if (!contract) return;
    await supabase.storage.from("documents").remove([contract.contract_file_path]);
    if (contract.signed_file_path) {
      await supabase.storage.from("documents").remove([contract.signed_file_path]);
    }
    const { error } = await supabase.from("contracts").delete().eq("id", contract.id);
    if (error) {
      toast({ title: "Delete failed", variant: "destructive" });
      return;
    }
    toast({ title: "Contract deleted" });
    setContract(null);
  };

  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Contract</h2>
          {contract && (
            contract.status === "signed" ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-0 ml-1">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Signed
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-800 border-0 ml-1">Pending signature</Badge>
            )
          )}
        </div>
        <label>
          <input
            type="file"
            accept={ALLOWED_EXTENSIONS}
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button asChild size="sm" disabled={uploading}>
            <span className="cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              {contract ? "Replace contract" : "Upload contract"}
            </span>
          </Button>
        </label>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !contract ? (
        <div className="py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            No contract uploaded yet. Upload a contract for {clientName} so they can sign it before services begin.
          </p>
          <div className="flex justify-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark as signed outside portal
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mark as signed outside portal?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Use this if {clientName} signed a contract in person or via another channel and you don't need to upload the file. Their services will be unblocked immediately. You can still upload the signed copy later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={markSignedOutsidePortal}>Mark signed</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
            <div className="rounded-lg bg-muted p-2 shrink-0">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{contract.contract_file_name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(contract.contract_file_size)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => downloadFile(contract.contract_file_path, contract.contract_file_name)} title="Download">
              <Download className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete contract?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the contract and any signature data. The client will need to sign a new one.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteContract}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {contract.status === "signed" && (
            <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-medium text-foreground">Signature details</p>
                {contract.signature_hash ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="h-3 w-3" /> Sealed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    <ShieldAlert className="h-3 w-3" /> Legacy (unsealed)
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Method: <span className="text-foreground capitalize">{contract.signature_method?.replace("_", " ") ?? "—"}</span></p>
                <p>Signed at: <span className="text-foreground">{contract.signed_at ? new Date(contract.signed_at).toLocaleString("en-GB") : "—"}</span></p>
                {contract.signature_typed_name && (
                  <p>Typed name: <span className="text-foreground italic font-serif">"{contract.signature_typed_name}"</span></p>
                )}
                {contract.signature_drawn_data_url && (
                  <div>
                    <p className="mb-1">Drawn signature:</p>
                    <img src={contract.signature_drawn_data_url} alt="Signature" className="bg-white border border-border rounded max-h-24" />
                  </div>
                )}
                {contract.signed_file_name && (
                  <p>
                    Uploaded signed copy: <span className="text-foreground">{contract.signed_file_name}</span>{" "}
                    <Button variant="link" size="sm" className="h-auto p-0" onClick={() => downloadFile(contract.signed_file_path!, contract.signed_file_name!)}>
                      Download
                    </Button>
                  </p>
                )}
                {contract.signature_hash && (
                  <p className="font-mono break-all text-[10px] opacity-70 pt-1">SHA-256: {contract.signature_hash}</p>
                )}
              </div>
              {contract.signature_hash && (
                <Button variant="outline" size="sm" onClick={verifyIntegrity} className="mt-2">
                  <ShieldCheck className="h-4 w-4 mr-1.5" /> Verify integrity
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {contract.status === "pending_signature" ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark as signed manually
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mark contract as signed?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Use this only if you have confirmed the signature outside the portal (e.g., signed in person or received by email). This unblocks the client's services.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={markSigned}>Mark signed</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button variant="outline" size="sm" onClick={reopenContract}>
                Re-open for signing
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
