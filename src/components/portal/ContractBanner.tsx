import { useState } from "react";
import { AlertTriangle, FileSignature } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useContractStatus } from "@/hooks/useContractStatus";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  showModalOnLoad?: boolean;
}

export function ContractBanner({ showModalOnLoad = false }: Props) {
  const { contract, hasContract, isSigned, loading } = useContractStatus();
  const navigate = useNavigate();
  const [open, setOpen] = useState(showModalOnLoad);

  if (loading || isSigned) return null;

  const message = !hasContract
    ? "Your contract has not been issued yet. Once your administrator uploads it, you'll be asked to sign it before any services can begin."
    : "Your services will not be initiated until your contract is signed. Please review and sign your contract to proceed.";

  return (
    <>
      <div className="mx-4 md:mx-6 mt-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            {!hasContract ? "Awaiting contract" : "Contract signature required"}
          </p>
          <p className="text-xs text-amber-800/90 dark:text-amber-200/90 mt-0.5">{message}</p>
        </div>
        {hasContract && (
          <Button
            size="sm"
            onClick={() => navigate("/portal/contract")}
            className="flex-shrink-0"
          >
            <FileSignature className="h-4 w-4 mr-1.5" />
            Sign now
          </Button>
        )}
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Contract signature required
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasContract
                ? "Before we can begin work on your services, we need your signed contract. You can sign it electronically (typed or drawn signature) or upload a hand-signed scanned copy."
                : "Your contract is being prepared. Once your administrator uploads it, you'll be notified and asked to sign it. Until then, services cannot be initiated."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Later</AlertDialogCancel>
            {hasContract && (
              <AlertDialogAction onClick={() => navigate("/portal/contract")}>
                Go to contract
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
