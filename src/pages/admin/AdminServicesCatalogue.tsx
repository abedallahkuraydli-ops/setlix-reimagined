import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, Pencil, Trash2, Check, X, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { notifyClientOfChange } from "@/lib/clientNotifications";

interface PendingRequest {
  id: string;
  client_id: string;
  service_catalogue_id: string;
  client_note: string | null;
  created_at: string;
  service_catalogue: { name: string; category: string } | null;
  profiles: { full_name: string | null; first_name: string | null; last_name: string | null } | null;
}

interface CatItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  active: boolean;
  created_at: string;
  price_cents: number | null;
  vat_rate: number;
  currency: string;
}

const fmt = (cents: number | null, ccy: string) =>
  cents == null ? "—" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: ccy || "EUR" }).format(cents / 100);

const AdminServicesCatalogue = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<CatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatItem | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [priceNetEuros, setPriceNetEuros] = useState("");
  const [vatRate, setVatRate] = useState("23");

  const netNum = parseFloat(priceNetEuros);
  const vatNum = parseFloat(vatRate);
  const hasNet = priceNetEuros.trim() !== "" && !isNaN(netNum);
  const vatAmount = hasNet && !isNaN(vatNum) ? netNum * (vatNum / 100) : 0;
  const grossAmount = hasNet ? netNum + vatAmount : 0;

  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchItems = async () => {
    const { data } = await supabase.from("service_catalogue").select("*").order("category").order("name");
    if (data) setItems(data as CatItem[]);
    setLoading(false);
  };

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("service_requests")
      .select("id, client_id, service_catalogue_id, client_note, created_at, service_catalogue(name, category), profiles!service_requests_client_id_fkey(full_name, first_name, last_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    // Fallback: join may not have FK named — fetch profile separately if shape mismatch
    if (data) {
      setRequests(data as any);
    } else {
      // simple fallback
      const { data: rs } = await supabase
        .from("service_requests")
        .select("id, client_id, service_catalogue_id, client_note, created_at, service_catalogue(name, category)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (rs) {
        const ids = Array.from(new Set(rs.map((r: any) => r.client_id)));
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, first_name, last_name")
          .in("id", ids);
        const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
        setRequests(rs.map((r: any) => ({ ...r, profiles: profMap.get(r.client_id) || null })));
      }
    }
    setReqLoading(false);
  };

  useEffect(() => { fetchItems(); fetchRequests(); }, []);

  const decide = async (id: string, status: "approved" | "rejected") => {
    setActingId(id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("service_requests")
      .update({ status, reviewed_by_admin_id: user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setActingId(null);
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "approved" ? "Request approved" : "Request rejected" });
    fetchRequests();
  };

  const openNew = () => {
    setEditItem(null);
    setName(""); setCategory(""); setDescription(""); setActive(true);
    setPriceNetEuros(""); setVatRate("23");
    setOpen(true);
  };

  const openEdit = (item: CatItem) => {
    setEditItem(item);
    setName(item.name); setCategory(item.category);
    setDescription(item.description || ""); setActive(item.active);
    const vat = item.vat_rate ?? 23;
    const net = item.price_cents != null ? item.price_cents / 100 / (1 + vat / 100) : null;
    setPriceNetEuros(net != null ? net.toFixed(2) : "");
    setVatRate(String(vat));
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !category.trim()) return;
    const priceCents = hasNet ? Math.round(grossAmount * 100) : null;
    const payload = {
      name: name.trim(),
      category: category.trim(),
      description: description.trim() || null,
      active,
      price_cents: priceCents,
      vat_rate: parseFloat(vatRate) || 23,
    };
    if (editItem) {
      const { error } = await supabase.from("service_catalogue").update(payload).eq("id", editItem.id);
      if (error) toast({ title: "Update failed", variant: "destructive" });
      else toast({ title: "Service updated" });
    } else {
      const { error } = await supabase.from("service_catalogue").insert(payload);
      if (error) toast({ title: "Create failed", variant: "destructive" });
      else toast({ title: "Service created" });
    }
    setOpen(false);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("service_catalogue").delete().eq("id", id);
    toast({ title: "Service deleted" });
    fetchItems();
  };

  const grouped = items.reduce<Record<string, CatItem[]>>((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  const pendingCount = requests.length;
  const clientName = (r: PendingRequest) =>
    r.profiles?.full_name?.trim() ||
    [r.profiles?.first_name, r.profiles?.last_name].filter(Boolean).join(" ").trim() ||
    "Unknown client";

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Services Catalogue</h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} services</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Service" : "New Service"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Financial Services" /></div>
              <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Net price (EUR, excl. VAT)</Label><Input type="number" min="0" step="0.01" value={priceNetEuros} onChange={(e) => setPriceNetEuros(e.target.value)} placeholder="e.g. 121.95" /></div>
                <div><Label>VAT rate (%)</Label><Input type="number" min="0" step="0.01" value={vatRate} onChange={(e) => setVatRate(e.target.value)} /></div>
              </div>
              {hasNet && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1 tabular-nums">
                  <div className="flex justify-between"><span className="text-muted-foreground">Net</span><span className="text-foreground">{netNum.toFixed(2)} €</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">VAT ({vatNum || 0}%)</span><span className="text-foreground">{vatAmount.toFixed(2)} €</span></div>
                  <div className="flex justify-between font-semibold pt-1 border-t border-border"><span className="text-foreground">Gross (incl. VAT)</span><span className="text-foreground">{grossAmount.toFixed(2)} €</span></div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Leave net price empty for "quote on request" services. The gross price is calculated automatically and used for invoicing.</p>
              <div className="flex items-center gap-2"><Switch checked={active} onCheckedChange={setActive} /><Label>Active</Label></div>
              <Button onClick={handleSave} disabled={!name.trim() || !category.trim()} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue={pendingCount > 0 ? "requests" : "catalogue"} className="w-full">
        <TabsList>
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
          <TabsTrigger value="requests">
            Client Requests
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white border-0 text-[10px] h-5 px-1.5">{pendingCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogue" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat}</h3>
                  <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{item.name}</p>
                            {!item.active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                          </div>
                          {item.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>}
                        </div>
                        <div className="text-right tabular-nums shrink-0 mr-2">
                          <div className="text-sm font-semibold text-foreground">{fmt(item.price_cents, item.currency)}</div>
                          {item.price_cents != null && (
                            <div className="text-[10px] text-muted-foreground leading-tight">
                              incl. {item.vat_rate}% VAT · net {fmt(Math.round(item.price_cents / (1 + (item.vat_rate ?? 0) / 100)), item.currency)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          {reqLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : requests.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-10 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No pending service requests.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
              {requests.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {clientName(r)} <span className="text-muted-foreground font-normal">requested</span>{" "}
                      {r.service_catalogue?.name || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.service_catalogue?.category} · {new Date(r.created_at).toLocaleString()}
                    </p>
                    {r.client_note && (
                      <p className="text-xs text-foreground mt-2 bg-muted/50 rounded p-2">{r.client_note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decide(r.id, "rejected")}
                      disabled={actingId === r.id}
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => decide(r.id, "approved")}
                      disabled={actingId === r.id}
                    >
                      {actingId === r.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminServicesCatalogue;
