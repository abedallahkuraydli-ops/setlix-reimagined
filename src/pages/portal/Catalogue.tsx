import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";

interface CatalogueItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  active: boolean;
}

interface ClientServiceLite {
  service_catalogue_id: string;
  status: string;
}

interface RequestLite {
  service_catalogue_id: string;
  status: "pending" | "approved" | "rejected";
}

const Catalogue = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [activeServices, setActiveServices] = useState<ClientServiceLite[]>([]);
  const [requests, setRequests] = useState<RequestLite[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<CatalogueItem | null>(null);

  const refresh = async (pid: string) => {
    const [cat, services, reqs] = await Promise.all([
      supabase.from("service_catalogue").select("id, name, category, description, active").eq("active", true).order("category").order("name"),
      supabase.from("client_services").select("service_catalogue_id, status").eq("client_id", pid),
      supabase.from("service_requests").select("service_catalogue_id, status").eq("client_id", pid).eq("status", "pending"),
    ]);
    if (cat.data) setItems(cat.data as CatalogueItem[]);
    if (services.data) setActiveServices(services.data as ClientServiceLite[]);
    if (reqs.data) setRequests(reqs.data as RequestLite[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!profile) { setLoading(false); return; }
      setProfileId(profile.id);
      await refresh(profile.id);
    })();
  }, [user]);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, CatalogueItem[]>>((acc, item) => {
      (acc[item.category] = acc[item.category] || []).push(item);
      return acc;
    }, {});
  }, [items]);

  const stateOf = (catId: string): "active" | "pending" | "none" => {
    if (requests.some((r) => r.service_catalogue_id === catId)) return "pending";
    if (activeServices.some((s) => s.service_catalogue_id === catId && s.status !== "completed")) return "active";
    return "none";
  };

  const submitRequest = async (item: CatalogueItem) => {
    if (!profileId) return;
    setSubmittingId(item.id);
    try {
      const requestId = crypto.randomUUID();
      const { error } = await supabase.from("service_requests").insert({
        id: requestId,
        client_id: profileId,
        service_catalogue_id: item.id,
        status: "pending",
      });
      if (error) {
        toast({ title: "Could not send request", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Request sent", description: "Setlix will review and approve shortly." });

      // Fire-and-forget internal notifications
      (async () => {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, first_name, last_name")
            .eq("id", profileId)
            .maybeSingle();
          const clientName = profile?.full_name
            || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ")
            || undefined;
          const templateData = {
            clientName,
            clientEmail: user?.email,
            serviceName: item.name,
            serviceCategory: item.category,
            requestedAt: new Date().toISOString(),
          };
          const recipients = ["info@setlix.pt", "legal@setlix.pt"];
          await Promise.all(recipients.map((to) =>
            supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "service-request-notification",
                recipientEmail: to,
                idempotencyKey: `service-request-${requestId}-${to}`,
                templateData,
              },
            })
          ));
        } catch (e) {
          console.error("Failed to send service request notification", e);
        }
      })();

      await refresh(profileId);
    } finally {
      setSubmittingId(null);
      setConfirmItem(null);
    }
  };

  const handleClick = (item: CatalogueItem) => {
    const s = stateOf(item.id);
    if (s === "active") {
      setConfirmItem(item);
    } else {
      submitRequest(item);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Services Catalogue</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse all services Setlix offers. Request the ones you need — our team will review and confirm.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          No services available right now.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat}</h3>
              <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
                {list.map((item) => {
                  const s = stateOf(item.id);
                  const isPending = s === "pending";
                  const isActive = s === "active";
                  return (
                    <div key={item.id} className="flex items-start gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          {isActive && (
                            <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">
                              <Clock className="h-3 w-3 mr-1" /> Already in progress
                            </Badge>
                          )}
                          {isPending && (
                            <Badge className="bg-blue-100 text-blue-800 border-0 text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Awaiting approval
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={isActive ? "outline" : "default"}
                        onClick={() => handleClick(item)}
                        disabled={isPending || submittingId === item.id}
                      >
                        {submittingId === item.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1" />
                        )}
                        {isPending ? "Requested" : isActive ? "Request again" : "Request"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmItem} onOpenChange={(o) => !o && setConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Service already in progress</AlertDialogTitle>
            <AlertDialogDescription>
              You already have <span className="font-medium text-foreground">{confirmItem?.name}</span> active.
              Do you want to request it again as an additional service? It will be added separately once approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmItem && submitRequest(confirmItem)}>
              Yes, request again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Catalogue;
