import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { Check, X, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PRIVACY_POLICY_VERSION, stagePendingConsent } from "@/lib/consent";

const passwordRules = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const SUPERADMIN_EMAIL = "info@setlix.pt";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [superadminNeedsSetup, setSuperadminNeedsSetup] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, roleLoading, isAdmin } = useRole();

  const passwordChecks = passwordRules.map((r) => ({ ...r, valid: r.test(password) }));
  const passwordValid = passwordChecks.every((c) => c.valid);
  const isSuperadminEmail = email.trim().toLowerCase() === SUPERADMIN_EMAIL;

  // When the superadmin email is typed, check if the account still needs
  // first-time setup (no password yet). If so, surface the setup CTA.
  useEffect(() => {
    let cancelled = false;
    if (!isSuperadminEmail) {
      setSuperadminNeedsSetup(false);
      setSetupMode(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase.functions.invoke("setup-superadmin", {
        body: { action: "status" },
      });
      if (cancelled || error) return;
      setSuperadminNeedsSetup(Boolean(data?.needs_setup));
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperadminEmail]);

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={isAdmin ? "/admin" : "/portal"} replace />;
  }

  // Bootstraps the superadmin account (creates or sets password + confirms
  // email server-side), then signs in. Returns true on success.
  const bootstrapSuperadminAndSignIn = async (): Promise<boolean> => {
    if (!passwordValid) {
      toast({
        title: "Choose a stronger password",
        description:
          "First-time superadmin setup requires 8+ chars with uppercase, lowercase, number, and special character.",
        variant: "destructive",
      });
      setPasswordFocused(true);
      return false;
    }
    const { data: setupData, error: setupErr } = await supabase.functions.invoke(
      "setup-superadmin",
      { body: { action: "setup", password } },
    );
    if (setupErr || setupData?.error) {
      toast({
        title: "Setup failed",
        description: setupData?.error ?? setupErr?.message ?? "Unknown error",
        variant: "destructive",
      });
      return false;
    }
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: SUPERADMIN_EMAIL,
      password,
    });
    if (signInErr) {
      toast({ title: "Login failed", description: signInErr.message, variant: "destructive" });
      return false;
    }
    setSuperadminNeedsSetup(false);
    toast({ title: "Superadmin account ready", description: "Welcome." });
    navigate("/admin");
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const trimmedEmail = email.trim();
    const isSuperadmin = trimmedEmail.toLowerCase() === SUPERADMIN_EMAIL;

    // First-time superadmin entry — if the status check already flagged it,
    // skip the normal sign-in attempt entirely.
    if (isSuperadmin && superadminNeedsSetup) {
      await bootstrapSuperadminAndSignIn();
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    // Fallback: if this is the superadmin email and sign-in failed because
    // the account isn't fully set up (no password yet, or email not yet
    // confirmed), bootstrap it on the fly using the typed password.
    if (
      error &&
      isSuperadmin &&
      (error.message === "Invalid login credentials" ||
        error.message === "Email not confirmed" ||
        /invalid|not confirmed/i.test(error.message))
    ) {
      // Re-check status to confirm bootstrap is actually appropriate.
      const { data: status } = await supabase.functions.invoke("setup-superadmin", {
        body: { action: "status" },
      });
      if (status?.needs_setup) {
        setSuperadminNeedsSetup(true);
        const ok = await bootstrapSuperadminAndSignIn();
        setLoading(false);
        if (!ok) return;
        return;
      }
    }

    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/portal");
    }
  };

  const handleSuperadminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperadminEmail) return;
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (!passwordValid) {
      toast({ title: "Password doesn't meet requirements", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("setup-superadmin", {
      body: { action: "setup", password },
    });
    if (error || data?.error) {
      setLoading(false);
      toast({
        title: "Setup failed",
        description: data?.error ?? error?.message ?? "Unknown error",
        variant: "destructive",
      });
      return;
    }
    // Account is created with email already confirmed — log in immediately.
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: SUPERADMIN_EMAIL,
      password,
    });
    setLoading(false);
    if (signInErr) {
      toast({ title: "Login failed", description: signInErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Superadmin account ready", description: "Welcome." });
    navigate("/admin");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (!passwordValid) {
      toast({ title: "Password doesn't meet requirements", variant: "destructive" });
      return;
    }
    if (!acceptedPolicy) {
      toast({ title: "Please accept the Privacy Policy to continue", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/portal`,
      },
    });
    if (!error && data.user) {
      // The new user has no session yet (email verification required), so
      // RLS would block consent_log inserts. Stage locally and flush after
      // first successful sign-in.
      stagePendingConsent({
        consentType: "privacy_policy",
        policyVersion: PRIVACY_POLICY_VERSION,
        granted: true,
        metadata: { source: "signup" },
      });
    }
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Check your email",
        description: "We sent you a confirmation link. Please verify your email to continue.",
      });
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Enter your email first", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "Password reset link sent." });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] border-[80px] border-primary-foreground/20 rotate-45 translate-x-1/3" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] border-[60px] border-primary-foreground/15 rotate-45 -translate-x-1/4" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <a href="/" className="flex items-center justify-center mb-8">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-primary-foreground mr-2" fill="currentColor" aria-hidden="true">
            <path d="M12 2 L13.2 9 L20 4.5 L15.5 11.3 L22 12 L15.5 12.7 L20 19.5 L13.2 15 L12 22 L10.8 15 L4 19.5 L8.5 12.7 L2 12 L8.5 11.3 L4 4.5 L10.8 9 Z" />
          </svg>
          <span className="text-primary-foreground font-bold text-2xl tracking-wider">SETLIX</span>
        </a>

        <div className="bg-background rounded-xl shadow-2xl p-8">
          {!setupMode && (
            <div className="flex mb-8 bg-muted rounded-lg p-1">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                  isLogin
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                  !isLogin
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {setupMode && (
            <div className="mb-6 rounded-md border border-border bg-muted/50 p-3">
              <p className="text-sm font-semibold text-foreground">Set up superadmin account</p>
              <p className="text-xs text-muted-foreground mt-1">
                Choose a password for {SUPERADMIN_EMAIL}. No email verification required.
              </p>
            </div>
          )}

          {!setupMode && isLogin && superadminNeedsSetup && (
            <div className="mb-4 rounded-md border border-border bg-muted/50 p-3">
              <p className="text-xs font-semibold text-foreground">
                First-time superadmin entry
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Type the password you want to use for {SUPERADMIN_EMAIL} below and press
                Log In. Your account will be created automatically — no email
                verification required.
              </p>
            </div>
          )}

          <form
            onSubmit={setupMode ? handleSuperadminSetup : isLogin ? handleLogin : handleSignup}
            className="space-y-4"
          >
            {!isLogin && !setupMode && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  maxLength={100}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  required
                  minLength={isLogin ? 6 : 8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {(!isLogin || setupMode || (isLogin && superadminNeedsSetup)) && (passwordFocused || password.length > 0) && (
                <div className="rounded-md border border-border bg-muted/50 p-3 space-y-1.5 animate-in fade-in slide-in-from-top-1">
                  <p className="text-xs font-medium text-foreground mb-2">Password must contain:</p>
                  {passwordChecks.map((check) => (
                    <div key={check.id} className="flex items-center gap-2 text-xs">
                      {check.valid ? (
                        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className={check.valid ? "text-green-600 dark:text-green-500" : "text-muted-foreground"}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(!isLogin || setupMode) && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {!isLogin && !setupMode && (
              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="accept-policy"
                  checked={acceptedPolicy}
                  onCheckedChange={(c) => setAcceptedPolicy(c === true)}
                />
                <label htmlFor="accept-policy" className="text-xs text-muted-foreground leading-tight">
                  I have read and accept the{" "}
                  <a href="/privacy-policy" target="_blank" className="underline text-primary">
                    Privacy Policy
                  </a>{" "}
                  (v{PRIVACY_POLICY_VERSION}) and consent to processing of my personal data under
                  GDPR &amp; Portuguese Law 58/2019.
                </label>
              </div>
            )}

            {isLogin && !setupMode && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-accent hover:underline"
              >
                Forgot password?
              </button>
            )}

            {setupMode && (
              <button
                type="button"
                onClick={() => setSetupMode(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to login
              </button>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={
                loading ||
                (setupMode && !passwordValid) ||
                (!isLogin && !setupMode && (!passwordValid || !acceptedPolicy))
              }
            >
              {loading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
              ) : setupMode ? (
                "Create Superadmin Account"
              ) : isLogin ? (
                "Log In"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
