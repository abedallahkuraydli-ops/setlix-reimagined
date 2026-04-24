import { ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentName?: string | null;
}

export function UnauthorisedDownloadDialog({ open, onOpenChange, documentName }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <DialogTitle>Download not authorised</DialogTitle>
          </div>
          <DialogDescription className="pt-2 space-y-2">
            <p>
              You do not have download rights for{" "}
              <span className="font-medium text-foreground">
                {documentName ?? "this document"}
              </span>
              .
            </p>
            <p>
              Documents available to you are marked with a green download icon. For anything
              else, please request approval from a Setlix superadmin.
            </p>
            <p className="text-xs text-muted-foreground pt-2">
              This attempt has been logged and superadmins have been notified.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
