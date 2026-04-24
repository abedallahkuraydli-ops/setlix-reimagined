import { useEffect, useState } from "react";
import { Navigate, Routes, Route, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/portal/Dashboard";
import Services from "@/pages/portal/Services";
import Catalogue from "@/pages/portal/Catalogue";
import Documents from "@/pages/portal/Documents";
import Payments from "@/pages/portal/Payments";
import Invoices from "@/pages/portal/Invoices";
import Messages from "@/pages/portal/Messages";
import Support from "@/pages/portal/Support";
import Settings from "@/pages/portal/Settings";
import Appointments from "@/pages/portal/Appointments";
import Contract from "@/pages/portal/Contract";
import Surveys from "@/pages/portal/Surveys";

const PortalShell = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full bg-background">
      <PortalSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <PortalHeader />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  </SidebarProvider>
);

const Portal = () => {
  const { user, isAdmin, roleLoading } = useRole();
  const navigate = useNavigate();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (roleLoading || !user) return;

    if (isAdmin) {
      navigate("/admin", { replace: true });
      return;
    }

    let cancelled = false;
    const checkOnboarding = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single();

      if (cancelled) return;

      const completed = data?.onboarding_completed ?? false;
      setOnboardingCompleted(completed);
      setCheckingOnboarding(false);

      const path = window.location.pathname;
      if (path === "/portal" || path === "/portal/") {
        navigate(completed ? "/portal/dashboard" : "/portal/onboarding", { replace: true });
      } else if (!completed && path !== "/portal/onboarding") {
        navigate("/portal/onboarding", { replace: true });
      }
    };

    checkOnboarding();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, roleLoading, navigate]);

  if (roleLoading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="onboarding" element={<Onboarding />} />
      <Route
        path="*"
        element={
          onboardingCompleted === false ? (
            <Navigate to="/portal/onboarding" replace />
          ) : (
            <PortalShell>
              <Routes>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="contract" element={<Contract />} />
                <Route path="services" element={<Services />} />
                <Route path="catalogue" element={<Catalogue />} />
                <Route path="documents" element={<Documents />} />
                <Route path="payments" element={<Payments />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="messages" element={<Messages />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="support" element={<Support />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/portal/dashboard" replace />} />
              </Routes>
            </PortalShell>
          )
        }
      />
    </Routes>
  );
};

export default Portal;
