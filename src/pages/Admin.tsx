import { Navigate, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import SuperadminRoute from "@/components/SuperadminRoute";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminClients from "@/pages/admin/AdminClients";
import AdminClientDetail from "@/pages/admin/AdminClientDetail";
import AdminServicesCatalogue from "@/pages/admin/AdminServicesCatalogue";
import AdminAppointments from "@/pages/admin/AdminAppointments";
import AdminMessages from "@/pages/admin/AdminMessages";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminBreachProcedure from "@/pages/admin/AdminBreachProcedure";
import AdminManagement from "@/pages/admin/AdminManagement";
import AdminSurveys from "@/pages/admin/AdminSurveys";
import AdminLockedAccounts from "@/pages/admin/AdminLockedAccounts";

const Admin = () => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="clients/:clientId" element={<AdminClientDetail />} />
            <Route path="appointments" element={<AdminAppointments />} />
            <Route path="services" element={<SuperadminRoute><AdminServicesCatalogue /></SuperadminRoute>} />
            <Route path="messages" element={<SuperadminRoute><AdminMessages /></SuperadminRoute>} />
            <Route path="settings" element={<SuperadminRoute><AdminSettings /></SuperadminRoute>} />
            <Route path="breach-procedure" element={<SuperadminRoute><AdminBreachProcedure /></SuperadminRoute>} />
            <Route path="admins" element={<SuperadminRoute><AdminManagement /></SuperadminRoute>} />
            <Route path="surveys" element={<SuperadminRoute><AdminSurveys /></SuperadminRoute>} />
            <Route path="locked-accounts" element={<SuperadminRoute><AdminLockedAccounts /></SuperadminRoute>} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  </SidebarProvider>
);

export default Admin;
