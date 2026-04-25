import { useEffect, useState, useCallback } from "react";
import { Loader2, Check, X, Inbox, Inbox as InboxIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { notifyClientOfChange } from "@/lib/clientNotifications";

interface PendingRequest {
  id: string;
  client_id: string;
  service_catalogue_id: string;
  client_note: string | null;
  created_at: string;
  service_catalogue: { name: string; category: string } | null;
}

interface Props {
  clientId: string;
  onChanged?: () => void;
}

export const AdminPendingRequestsSection = ({ clientId, onChanged }: Props) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("service_requests")
      .select(
        "id, client_id, service_catalogue_id, client_note, created_at, service_catalogue(name, category)"
      )
      .eq("client_id", clientId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setRequests((data as unknown as PendingRequest[]) || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Realtime updates for this client's service_requests
  useEffect(() => {
    const channel = supabase
      .channel(`admin-client-requests-${clientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests", filter: `client_id=eq.${clientId}` },
        () => fetchRequests()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, fetchRequests]);

  const approveRequest = async (r: PendingRequest) => {
    setActingId(r.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("service_requests")
      .update({
        status: "approved",
        reviewed_by_admin_id: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    setActingId(null);
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Request approved" });
    notifyClientOfChange({
      clientProfileId: r.client_id,
      type: "service_request_approved",
      title: "Your service request was approved",
      body: `Your request for "${r.service_catalogue?.name || "the service"}" has been approved and added to your active services.`,
      linkPath: "/portal/dashboard",
    });
    fetchRequests();
    onChanged?.();
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast({ title: "Justification is required", variant: "destructive" });
      return;
    }
    setActingId(rejectTarget.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("service_requests")
      .update({
        status: "rejected",
        reviewed_by_admin_id: user?.id,
        reviewed_at: new Date().toISOString(),
        decision_note: reason,
      })
      .eq("id", rejectTarget.id);
    setActingId(null);
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Request rejected" });
    notifyClientOfChange({
      clientProfileId: rejectTarget.client_id,
      type: "service_request_rejected",
      title: "Your service request was rejected",
      body: `Your request for "${rejectTarget.service_catalogue?.name || "the service"}" was rejected. Reason: ${reason}`,
      linkPath: "/portal/dashboard",
      emailTemplateData: { rejectionReason: reason },
    });
    setRejectTarget(null);
    setRejectReason("");
    fetchRequests();
    onChanged?.();
  };

  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <InboxIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Requested Services</h2>
          {requests.length > 0 && (
            <Badge className="bg-amber-500 text-white border-0">{requests.length} pending</Badge>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Inbox className="h-7 w-7 mx-auto mb-2 opacity-60" />
          No pending service requests from this client.
        </div>
      ) : (
        <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
          {requests.map((r) => (
            <div key={r.id} className="flex items-start gap-3 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {r.service_catalogue?.name || "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.service_catalogue?.category} · Requested {new Date(r.created_at).toLocaleString()}
                </p>
                {r.client_note && (
                  <p className="text-xs text-foreground mt-2 bg-muted/50 rounded p-2">
                    “{r.client_note}”
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setRejectTarget(r); setRejectReason(""); }}
                  disabled={actingId === r.id}
                >
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => approveRequest(r)}
                  disabled={actingId === r.id}
                >
                  {actingId === r.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject service request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Please provide a justification. The client will see this reason in their portal and email.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (required)"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setRejectTarget(null); setRejectReason(""); }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitReject}
              disabled={!rejectReason.trim() || actingId === rejectTarget?.id}
            >
              {actingId === rejectTarget?.id ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : null}
              Reject request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
