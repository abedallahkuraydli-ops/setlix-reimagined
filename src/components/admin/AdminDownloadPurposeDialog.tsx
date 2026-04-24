import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentName?: string | null;
  onConfirm: (purpose: string) => void | Promise<void>;
}

const PRESET_PURPOSES = [
  { value: "client_request", label: "Responding to client request" },
  { value: "service_delivery", label: "Service delivery (relocation/visa/etc.)" },
  { value: "tax_filing", label: "Tax / accounting filing" },
  { value: "legal_obligation", label: "Legal obligation / court order" },
  { value: "internal_audit", label: "Internal audit / quality review" },
  { value: "other", label: "Other (specify below)" },
];

/**
 * GDPR Art. 5(2) accountability — record WHY an admin accessed a client document.
 * Mandatory before any admin download. Logged to document_audit_log.download_purpose.
 */
export function AdminDownloadPurposeDialog({ open, onOpenChange, documentName, onConfirm }: Props) {
  const [preset, setPreset] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setPreset("");
    setNote("");
    setSubmitting(false);
  };

  const handleConfirm = async () => {
    if (!preset) return;
    const presetLabel = PRESET_PURPOSES.find((p) => p.value === preset)?.label ?? preset;
    const finalPurpose =
      preset === "other"
        ? note.trim()
        : note.trim()
          ? `${presetLabel} — ${note.trim()}`
          : presetLabel;
    if (!finalPurpose) return;
    setSubmitting(true);
    try {
      await onConfirm(finalPurpose);
      onOpenChange(false);
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = preset && (preset !== "other" || note.trim().length >= 5);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <DialogTitle>Confirm download purpose</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            For GDPR accountability (Art. 5(2)), please record why you need to access{" "}
            <span className="font-medium text-foreground">{documentName ?? "this document"}</span>.
            This is logged in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_PURPOSES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>
              Notes {preset === "other" ? <span className="text-destructive">*</span> : <span className="text-muted-foreground text-xs">(optional)</span>}
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={preset === "other" ? "Describe the purpose (min. 5 characters)" : "Add context if useful"}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canSubmit || submitting}>
            {submitting ? "Logging…" : "Confirm & download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
