import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type State = "validating" | "valid" | "already" | "invalid" | "submitting" | "success" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("validating");

  useEffect(() => {
    const validate = async () => {
      if (!token) { setState("invalid"); return; }
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await res.json();
        if (res.ok && data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("invalid");
      }
    };
    validate();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error) { setState("error"); return; }
      if (data?.success) setState("success");
      else if (data?.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-foreground mb-3">Email preferences</h1>
        {state === "validating" && <p className="text-muted-foreground">Validating your link…</p>}
        {state === "valid" && (
          <>
            <p className="text-muted-foreground mb-6">Click below to unsubscribe from Setlix emails.</p>
            <button onClick={confirm} className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
              Confirm unsubscribe
            </button>
          </>
        )}
        {state === "submitting" && <p className="text-muted-foreground">Processing…</p>}
        {state === "success" && <p className="text-foreground">You've been unsubscribed. We're sorry to see you go.</p>}
        {state === "already" && <p className="text-foreground">This email is already unsubscribed.</p>}
        {state === "invalid" && <p className="text-destructive">This unsubscribe link is invalid or has expired.</p>}
        {state === "error" && <p className="text-destructive">Something went wrong. Please try again later.</p>}
      </div>
    </main>
  );
};

export default Unsubscribe;
