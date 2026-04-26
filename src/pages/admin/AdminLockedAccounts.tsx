import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Lock, Unlock, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Lockout {
  id: string;
  email: string;
  user_id: string | null;
  locked_at: string;
  reason: string;
  failed_attempt_count: number;
  unlocked_at: string | null;
  password_reset_required: boolean;
  notes: string | null;
}

export default function AdminLockedAccounts() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [lockouts, setLockouts] = useState<Lockout[]>([]);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const fetchLockouts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("account_lockouts")
      .select("*")
      .is("unlocked_at", null)
      .order("locked_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setLockouts((data || []) as Lockout[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLockouts();
  }, []);

  const handleUnlock = async (lockout: Lockout) => {
    setUnlockingId(lockout.id);
    const { error } = await supabase.functions.invoke("admin-unlock-account", {
      body: { lockout_id: lockout.id, email: lockout.email },
    });
    setUnlockingId(null);
    if (error) {
      toast({ title: "Unlock failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Account unlocked",
        description: `${lockout.email} can now reset their password and sign in.`,
      });
      fetchLockouts();
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lock className="h-6 w-6 text-primary" /> Locked accounts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Accounts locked after 4 failed login attempts. Unlocking requires the user to reset their password.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLockouts} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : lockouts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No locked accounts.</div>
        ) : (
          <ul className="divide-y divide-border">
            {lockouts.map((l) => (
              <li key={l.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{l.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Locked {format(new Date(l.locked_at), "PPp")} · {l.failed_attempt_count} failed attempts · {l.reason}
                  </p>
                  {l.notes && <p className="text-xs text-muted-foreground mt-1">{l.notes}</p>}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleUnlock(l)}
                  disabled={unlockingId === l.id}
                >
                  <Unlock className="h-4 w-4 mr-2" />
                  {unlockingId === l.id ? "Unlocking…" : "Unlock & require reset"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
