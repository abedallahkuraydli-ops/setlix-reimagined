import { useState } from "react";
import { FileSignature, Download, Loader2, CheckCircle2, Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useContractStatus } from "@/hooks/useContractStatus";
import { SignaturePad } from "@/components/portal/SignaturePad";
import { validateFile, formatBytes } from "@/lib/documents";
import { sealSignature, type SignaturePayload } from "@/lib/crypto";
import { ShieldCheck } from "lucide-react";

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

const Contract = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { contract, loading, refetch } = useContractStatus();
  const [typedName, setTypedName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [drawnSig, setDrawnSig] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const downloadContract = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (error || !data) {
      toast({ title: "Download failed", description: error?.message, variant: "destructive" });
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.click();
  };

  const submitSignature = async (method: "typed" | "drawn") => {
    if (!contract || !user) return;
    if (!agreed) {
      toast({ title: "Please confirm agreement", variant: "destructive" });
      return;
    }
    if (method === "typed" && !typedName.trim()) {
      toast({ title: "Please type your full name", variant: "destructive" });
      return;
    }
    if (method === "drawn" && !drawnSig) {
      toast({ title: "Please draw your signature", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const signedAt = new Date().toISOString();
    const ua = navigator.userAgent;
    const payload: SignaturePayload = {
      contract_id: contract.id,
      client_id: (contract as any).client_id ?? "",
      contract_file_path: contract.contract_file_path,
      contract_file_name: contract.contract_file_name,
      signature_method: method,
      signature_typed_name: method === "typed" ? typedName.trim() : null,
      signature_drawn_data_url: method === "drawn" ? drawnSig : null,
      signed_file_path: null,
      signed_at: signedAt,
      signed_user_agent: ua,
    };
    const hash = await sealSignature(payload);
    const { error } = await supabase
      .from("contracts")
      .update({
        status: "signed",
        signature_method: method,
        signature_typed_name: method === "typed" ? typedName.trim() : null,
        signature_drawn_data_url: method === "drawn" ? drawnSig : null,
        signed_at: signedAt,
        signed_user_agent: ua,
        signature_hash: hash,
        sealed_at: signedAt,
      } as never)
      .eq("id", contract.id);
    setSubmitting(false);
    if (error) {
      toast({ title: "Failed to sign", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Contract signed", description: "Thank you. Your services can now be initiated." });
    refetch();
  };

  const uploadSignedCopy = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !contract || !user) return;
    const err = validateFile(file);
    if (err) {
      toast({ title: "Invalid file", description: err, variant: "destructive" });
      return;
    }
    setUploading(true);
    const path = `contracts/${user.id}/signed-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (upErr) {
      setUploading(false);
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const signedAt = new Date().toISOString();
    const ua = navigator.userAgent;
    const payload: SignaturePayload = {
      contract_id: contract.id,
      client_id: (contract as any).client_id ?? "",
      contract_file_path: contract.contract_file_path,
      contract_file_name: contract.contract_file_name,
      signature_method: "uploaded",
      signature_typed_name: null,
      signature_drawn_data_url: null,
      signed_file_path: path,
      signed_at: signedAt,
      signed_user_agent: ua,
    };
    const hash = await sealSignature(payload);
    const { error: dbErr } = await supabase
      .from("contracts")
      .update({
        status: "signed",
        signature_method: "uploaded",
        signed_file_path: path,
        signed_file_name: file.name,
        signed_at: signedAt,
        signed_user_agent: ua,
        signature_hash: hash,
        sealed_at: signedAt,
      } as never)
      .eq("id", contract.id);
    setUploading(false);
    if (dbErr) {
      toast({ title: "Failed to record signature", description: dbErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Signed contract uploaded", description: "Thank you." });
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileSignature className="h-6 w-6 text-primary" />
          Contract
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review and sign your service agreement. Services begin once the contract is signed.
        </p>
      </div>

      {!contract ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Awaiting contract</h2>
          <p className="text-sm text-muted-foreground max-w-sm text-center">
            Your contract has not been issued yet. Your administrator will upload it shortly. You'll be notified when it's ready to sign.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Contract document */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-muted p-2.5">
                  <FileText className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{contract.contract_file_name}</p>
                  <p className="text-xs text-muted-foreground">Issued contract</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {contract.status === "signed" ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-0">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Signed
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 border-0">Pending signature</Badge>
                )}
                <Button variant="outline" size="sm" onClick={() => downloadContract(contract.contract_file_path, contract.contract_file_name)}>
                  <Download className="h-4 w-4 mr-1.5" /> Download
                </Button>
              </div>
            </div>
          </div>

          {contract.status === "signed" ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 flex-wrap">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-semibold">Contract signed</p>
                {(contract as any).signature_hash && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-1">
                    <ShieldCheck className="h-3 w-3" /> Tamper-evident seal
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Method: <span className="text-foreground font-medium capitalize">{contract.signature_method?.replace("_", " ") ?? "—"}</span></p>
                <p>Signed at: <span className="text-foreground font-medium">{formatDate(contract.signed_at)}</span></p>
                {contract.signed_file_name && (
                  <p>
                    Signed copy: <span className="text-foreground font-medium">{contract.signed_file_name}</span>{" "}
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onClick={() => downloadContract(contract.signed_file_path!, contract.signed_file_name!)}
                    >
                      Download
                    </Button>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-lg font-semibold text-foreground mb-1">Sign your contract</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Choose how you'd like to sign. By signing, you agree to the terms outlined in the contract document above.
              </p>

              <Tabs defaultValue="typed">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="typed">Type name</TabsTrigger>
                  <TabsTrigger value="drawn">Draw signature</TabsTrigger>
                  <TabsTrigger value="upload">Upload signed copy</TabsTrigger>
                </TabsList>

                <TabsContent value="typed" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="typed-name">Full legal name</Label>
                    <Input
                      id="typed-name"
                      placeholder="e.g. Maria Santos"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      maxLength={120}
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="agree-typed" checked={agreed} onCheckedChange={(c) => setAgreed(c === true)} />
                    <label htmlFor="agree-typed" className="text-sm text-foreground leading-tight">
                      I have read the contract and I agree to be legally bound by its terms. I understand that typing my name constitutes my electronic signature.
                    </label>
                  </div>
                  <Button onClick={() => submitSignature("typed")} disabled={submitting} className="w-full sm:w-auto">
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSignature className="h-4 w-4 mr-2" />}
                    Sign contract
                  </Button>
                </TabsContent>

                <TabsContent value="drawn" className="space-y-4 pt-4">
                  <SignaturePad onChange={setDrawnSig} />
                  <div className="flex items-start gap-2">
                    <Checkbox id="agree-drawn" checked={agreed} onCheckedChange={(c) => setAgreed(c === true)} />
                    <label htmlFor="agree-drawn" className="text-sm text-foreground leading-tight">
                      I have read the contract and I agree to be legally bound by its terms. My drawn signature constitutes my electronic signature.
                    </label>
                  </div>
                  <Button onClick={() => submitSignature("drawn")} disabled={submitting} className="w-full sm:w-auto">
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSignature className="h-4 w-4 mr-2" />}
                    Sign contract
                  </Button>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Print the contract, sign it by hand, then scan or photograph the signed page and upload it here. PDF, JPG, PNG accepted (max 25 MB).
                  </p>
                  <Label htmlFor="upload-signed" className="block">
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer transition-colors">
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm font-medium text-foreground">Click to upload signed contract</p>
                        </>
                      )}
                    </div>
                    <input
                      id="upload-signed"
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={uploadSignedCopy}
                      disabled={uploading}
                    />
                  </Label>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Contract;
