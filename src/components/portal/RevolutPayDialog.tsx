import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const REVOLUT_EMBED_SRC_SANDBOX = "https://sandbox-merchant.revolut.com/embed.js";
const REVOLUT_EMBED_SRC_PROD = "https://merchant.revolut.com/embed.js";

declare global {
  interface Window {
    RevolutCheckout?: (token: string, mode?: "sandbox" | "prod") => Promise<any>;
  }
}

function loadRevolutScript(env: "sandbox" | "prod"): Promise<void> {
  const src = env === "prod" ? REVOLUT_EMBED_SRC_PROD : REVOLUT_EMBED_SRC_SANDBOX;
  return new Promise((resolve, reject) => {
    if (window.RevolutCheckout) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Revolut script failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Revolut script failed to load"));
    document.head.appendChild(s);
  });
}

interface RevolutPayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
  amountLabel: string;
  description: string;
  onPaid: () => void;
}

export const RevolutPayDialog = ({
  open,
  onOpenChange,
  invoiceId,
  amountLabel,
  description,
  onPaid,
}: RevolutPayDialogProps) => {
  const { toast } = useToast();
  const cardTargetRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<any>(null);
  const orderIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!open || !invoiceId) return;
    let cancelled = false;

    const confirmPayment = async () => {
      if (!orderIdRef.current || !invoiceId) return;
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          "revolut-confirm-order",
          { body: { order_id: orderIdRef.current, invoice_id: invoiceId } }
        );
        if (fnErr) throw new Error(fnErr.message || "Could not confirm payment");
        if (!data?.paid) throw new Error("Payment not completed");
        toast({ title: "Payment successful", description: "Thank you!" });
        onPaid();
        onOpenChange(false);
      } catch (e: any) {
        console.error("confirm error", e);
        setError(e?.message || "Payment received but confirmation failed. Please contact support.");
        setSubmitting(false);
      }
    };

    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          "revolut-create-order",
          { body: { invoice_id: invoiceId } }
        );
        if (fnErr) throw new Error(fnErr.message || "Failed to start payment");
        if (!data?.token) throw new Error("No payment token returned");
        orderIdRef.current = data.order_id ?? null;
        const env: "sandbox" | "prod" = data.environment === "live" ? "prod" : "sandbox";
        setIsLive(env === "prod");

        await loadRevolutScript(env);
        if (cancelled) return;

        const RC = await window.RevolutCheckout!(data.token, env);
        if (cancelled) return;

        await new Promise((r) => setTimeout(r, 50));
        if (!cardTargetRef.current) return;

        instanceRef.current = RC.createCardField({
          target: cardTargetRef.current,
          hidePostcodeField: false,
          styles: {
            default: {
              color: "hsl(var(--foreground))",
              fontFamily: "inherit",
              fontSize: "14px",
            },
          },
          onSuccess: () => { confirmPayment(); },
          onError: (err: any) => {
            console.error("Revolut payment error", err);
            setError(err?.message || "Payment failed. Please try again.");
            setSubmitting(false);
          },
          onCancel: () => { setSubmitting(false); },
        });
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Could not initialise payment");
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      try {
        instanceRef.current?.destroy?.();
      } catch {
        /* noop */
      }
      instanceRef.current = null;
    };
  }, [open, invoiceId, onOpenChange, onPaid, toast]);

  const handleSubmit = () => {
    if (!instanceRef.current) return;
    setSubmitting(true);
    try {
      instanceRef.current.submit({
        name: "Card holder",
        email: undefined,
      });
    } catch (e: any) {
      setSubmitting(false);
      setError(e?.message || "Could not submit payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay {amountLabel}</DialogTitle>
          <DialogDescription className="line-clamp-2">{description}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-card p-4">
          {loading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading secure card form…
            </div>
          )}
          <div ref={cardTargetRef} className={loading ? "hidden" : "min-h-[140px]"} />
          {error && (
            <p className="text-xs text-destructive mt-3">{error}</p>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Payments processed securely by Revolut Business.{!isLive && " Test mode — no real charge."}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || submitting || !!error}
          className="w-full"
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</>
          ) : (
            <>Pay {amountLabel}</>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
