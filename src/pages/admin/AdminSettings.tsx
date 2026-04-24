import { useEffect, useState } from "react";
import { Loader2, Save, Settings as SettingsIcon, Landmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const DAY_LABELS = [
  { v: 1, l: "Mon" },
  { v: 2, l: "Tue" },
  { v: 3, l: "Wed" },
  { v: 4, l: "Thu" },
  { v: 5, l: "Fri" },
  { v: 6, l: "Sat" },
  { v: 7, l: "Sun" },
];

interface Settings {
  id: string;
  working_hours_start: number;
  working_hours_end: number;
  working_days: number[];
  slot_duration_minutes: number;
  timezone: string;
  bank_name: string | null;
  bank_account_holder: string | null;
  bank_iban: string | null;
  bank_bic: string | null;
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("admin_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    setSettings(data as Settings | null);
  };

  useEffect(() => {
    load();
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  };

  const toggleDay = (day: number) => {
    if (!settings) return;
    const has = settings.working_days.includes(day);
    update(
      "working_days",
      has ? settings.working_days.filter((d) => d !== day) : [...settings.working_days, day].sort(),
    );
  };

  const save = async () => {
    if (!settings) return;
    if (settings.working_hours_end <= settings.working_hours_start) {
      toast.error("End hour must be after start hour");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("admin_settings")
      .update({
        working_hours_start: settings.working_hours_start,
        working_hours_end: settings.working_hours_end,
        working_days: settings.working_days,
        slot_duration_minutes: settings.slot_duration_minutes,
        timezone: settings.timezone,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Settings saved");
  };

  const saveBank = async () => {
    if (!settings) return;
    setSavingBank(true);
    const { error } = await supabase
      .from("admin_settings")
      .update({
        bank_name: settings.bank_name?.trim() || null,
        bank_account_holder: settings.bank_account_holder?.trim() || null,
        bank_iban: settings.bank_iban?.trim() || null,
        bank_bic: settings.bank_bic?.trim() || null,
      })
      .eq("id", settings.id);
    setSavingBank(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bank information saved");
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-2">
        <SettingsIcon className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Configure how appointment slots are generated for clients.
      </p>

      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <h2 className="text-base font-semibold text-foreground">Booking availability</h2>

        {!settings ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Working hours start</Label>
                <Input
                  id="start"
                  type="number"
                  min={0}
                  max={23}
                  value={settings.working_hours_start}
                  onChange={(e) =>
                    update("working_hours_start", Number(e.target.value))
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">e.g. 9 = 09:00</p>
              </div>
              <div>
                <Label htmlFor="end">Working hours end</Label>
                <Input
                  id="end"
                  type="number"
                  min={1}
                  max={24}
                  value={settings.working_hours_end}
                  onChange={(e) =>
                    update("working_hours_end", Number(e.target.value))
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">e.g. 18 = 18:00</p>
              </div>
            </div>

            <div>
              <Label>Working days</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {DAY_LABELS.map((d) => (
                  <label key={d.v} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={settings.working_days.includes(d.v)}
                      onCheckedChange={() => toggleDay(d.v)}
                    />
                    <span className="text-sm">{d.l}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="slot">Slot duration (minutes)</Label>
                <Input
                  id="slot"
                  type="number"
                  min={5}
                  max={240}
                  step={5}
                  value={settings.slot_duration_minutes}
                  onChange={(e) =>
                    update("slot_duration_minutes", Number(e.target.value))
                  }
                />
              </div>
              <div>
                <Label htmlFor="tz">Timezone</Label>
                <Input
                  id="tz"
                  value={settings.timezone}
                  onChange={(e) => update("timezone", e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">IANA name, e.g. Europe/Lisbon</p>
              </div>
            </div>

            <Button onClick={save} disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…</>
              ) : (
                <><Save className="h-4 w-4 mr-1.5" /> Save settings</>
              )}
            </Button>
          </>
        )}
      </div>

      {/* Bank information — shown to clients on the Payments page */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6 mt-6">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Bank information</h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-3">
          These details are displayed to clients on their Payments page for bank transfers.
        </p>

        {!settings ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bank-name">Bank name</Label>
                <Input
                  id="bank-name"
                  value={settings.bank_name ?? ""}
                  onChange={(e) => update("bank_name", e.target.value)}
                  placeholder="e.g. Millennium BCP"
                />
              </div>
              <div>
                <Label htmlFor="bank-holder">Account holder</Label>
                <Input
                  id="bank-holder"
                  value={settings.bank_account_holder ?? ""}
                  onChange={(e) => update("bank_account_holder", e.target.value)}
                  placeholder="Company / individual name"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bank-iban">IBAN</Label>
                <Input
                  id="bank-iban"
                  value={settings.bank_iban ?? ""}
                  onChange={(e) => update("bank_iban", e.target.value)}
                  placeholder="PT50 0000 0000 0000 0000 0000 0"
                />
              </div>
              <div>
                <Label htmlFor="bank-bic">BIC / SWIFT</Label>
                <Input
                  id="bank-bic"
                  value={settings.bank_bic ?? ""}
                  onChange={(e) => update("bank_bic", e.target.value)}
                  placeholder="e.g. BCOMPTPL"
                />
              </div>
            </div>

            <Button onClick={saveBank} disabled={savingBank}>
              {savingBank ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…</>
              ) : (
                <><Save className="h-4 w-4 mr-1.5" /> Save bank information</>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
