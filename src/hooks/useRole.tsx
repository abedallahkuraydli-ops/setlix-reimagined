import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "superadmin" | "admin" | "client";

export function useRole() {
  const auth = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!auth.user) {
      setRole(null);
      setRoleLoading(auth.loading);
      return;
    }

    if (auth.user.email?.endsWith("@setlix.pt")) {
      setRole("superadmin");
      setRoleLoading(false);
      return;
    }

    setRoleLoading(true);
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id);

      if (cancelled) return;

      const roles = (data ?? []).map((r) => r.role as AppRole);
      const resolved: AppRole | null = roles.includes("superadmin")
        ? "superadmin"
        : roles.includes("admin")
          ? "admin"
          : roles.includes("client")
            ? "client"
            : null;

      setRole(resolved);
      setRoleLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [auth.user, auth.loading]);

  return {
    ...auth,
    role,
    roleLoading: auth.loading || roleLoading,
    isSuperadmin: role === "superadmin",
    isAdmin: role === "admin" || role === "superadmin",
    isOnlyAdmin: role === "admin",
    isClient: role === "client",
  };
}
