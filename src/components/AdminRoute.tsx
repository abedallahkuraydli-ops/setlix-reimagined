import { Navigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, roleLoading, isAdmin } = useAdmin();

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/portal/dashboard" replace />;

  return <>{children}</>;
};

export default AdminRoute;
