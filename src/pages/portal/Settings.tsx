import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { User, Shield, Download, Trash2, FileLock2, FileCheck2, Eye, EyeOff, Check, X } from "lucide-react";
import { listConsents, type ConsentRecord } from "@/lib/consent";
import { buildClientDataExportZip } from "@/lib/dataExport";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [submittingDeletion, setSubmittingDeletion] = useState(false);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);

  const passwordRules = [
    { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
    { id: "upper", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
    { id: "lower", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
    { id: "number", label: "One number", test: (p: string) => /[0-9]/.test(p) },
    { id: "special", label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];
  const passwordChecks = passwordRules.map((r) => ({ ...r, valid: r.test(newPassword) }));
  const newPasswordValid = passwordChecks.every((c) => c.valid);

  const handleChangePassword = async () => {
    if (!user?.email) return;
    if (!currentPassword) {
      toast({ title: "Enter your current password", variant: "destructive" });
      return;
    }
    if (!newPasswordValid) {
      toast({ title: "Choose a stronger password", description: "Password does not meet all requirements.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    // Re-authenticate to verify current password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInErr) {
      setChangingPassword(false);
      toast({ title: "Current password is incorrect", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    toast({ title: "Password updated successfully" });
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name, last_name, phone_number")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFirstName(data.first_name || "");
          setLastName(data.last_name || "");
          setPhone(data.phone_number || "");
        }
      });

    listConsents(user.id).then(setConsents);
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
      })
      .eq("user_id", user.id);
    setLoading(false);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings saved" });
    }
  };

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const blob = await buildClientDataExportZip({
        userId: user.id,
        userEmail: user.email ?? null,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `setlix-data-export-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Your data export is ready",
        description:
          "ZIP includes your profile, survey responses, uploaded and Setlix-issued documents, and invoice PDFs.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed";
      toast({ title: "Export failed", description: msg, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setSubmittingDeletion(true);
    const { data, error } = await supabase.functions.invoke("client-delete-account", {
      body: { reason: deletionReason.trim() || null },
    });
    if (error || (data && (data as { error?: string }).error)) {
      setSubmittingDeletion(false);
      toast({
        title: "Deletion failed",
        description:
          (data as { error?: string } | null)?.error ||
          error?.message ||
          "Please try again or contact support.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Account deleted",
      description:
        "Your account has been deleted. Records required by Portuguese fiscal law are retained as explained.",
    });
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account details and privacy.</p>
      </div>

      <div className="space-y-6">
        {/* Profile section */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Email</Label>
            <Input value={user?.email || ""} disabled className="opacity-60" />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Security section */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Security</h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Change your password below. You'll need to enter your current password to confirm the change.
            </p>

            <div className="space-y-2">
              <Label className="text-foreground">Current password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">New password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onFocus={() => setNewPasswordFocused(true)}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {(newPasswordFocused || newPassword.length > 0) && (
                <ul className="mt-2 space-y-1">
                  {passwordChecks.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-xs">
                      {c.valid ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className={c.valid ? "text-green-700" : "text-muted-foreground"}>{c.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Confirm new password</Label>
              <Input
                type={showNew ? "text" : "password"}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? "Updating…" : "Update password"}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground border-t border-border pt-4">
            Forgot your current password? Sign out and use "Forgot password?" on the login page to receive a secure reset link by email.
          </p>
        </div>


        {/* Privacy & GDPR section */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <FileLock2 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Privacy & Your Data</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Under the EU General Data Protection Regulation (GDPR) and Portuguese Law no. 58/2019, you have the right to access, port, and erase your personal data.
          </p>

          <div className="border border-border rounded-lg p-4 flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">Export your data</p>
              <p className="text-xs text-muted-foreground mt-1">
                Download a complete copy of your personal data, services, documents metadata, messages, appointments, and access logs (GDPR Art. 20).
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4 mr-1" />
              {exporting ? "Preparing…" : "Export"}
            </Button>
          </div>

          <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4 flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">Delete your account</p>
              <p className="text-xs text-muted-foreground mt-1">
                Permanently delete your Setlix account and personal data. Records required by EU and Portuguese accounting and tax regulations (invoices, contracts and related fiscal documents) will be retained for the legally required period.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={submittingDeletion}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your personal data will be deleted from the Setlix database, except for
                    information we are legally required to keep for accounting and tax purposes
                    under EU and Portuguese regulations (e.g. invoices and related fiscal
                    documents).
                    <br /><br />
                    This action is permanent and cannot be undone. You can optionally tell us
                    why below.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Reason (optional)…"
                  rows={3}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={submittingDeletion}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {submittingDeletion ? "Deleting…" : "Delete my account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Consent history */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileCheck2 className="h-4 w-4 text-primary" />
              <p className="font-medium text-foreground text-sm">Consent history</p>
            </div>
            {consents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No consent records yet.</p>
            ) : (
              <ul className="space-y-2">
                {consents.slice(0, 8).map((c) => (
                  <li key={c.id} className="text-xs flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-foreground capitalize">{c.consent_type.replace("_", " ")}</span>
                    <span className="text-muted-foreground">
                      v{c.policy_version} · {new Date(c.created_at).toLocaleDateString("en-GB")} · {c.granted ? "granted" : "withdrawn"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            For the full data processing details, see our{" "}
            <a href="/privacy-policy" className="underline text-primary">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
