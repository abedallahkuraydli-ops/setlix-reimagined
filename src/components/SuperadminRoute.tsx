import { Navigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";

const SuperadminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, roleLoading, isSuperadmin } = useRole();
  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperadmin) return <Navigate to="/admin/clients" replace />;
  return <>{children}</>;
};

export default SuperadminRoute;
