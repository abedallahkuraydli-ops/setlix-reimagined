import { useRole } from "@/hooks/useRole";

// Backwards-compatible: isAdmin = superadmin OR admin (any portal admin access)
export function useAdmin() {
  const r = useRole();
  return { ...r, isAdmin: r.isAdmin };
}
