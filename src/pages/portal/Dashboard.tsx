import { useProfile } from "@/hooks/useProfile";
import {
  Briefcase,
  BookOpen,
  FileText,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Bell,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const firstName = profile?.first_name ?? "";
  const nif = profile?.nif ?? null;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const stats = [
    { label: "Active Services", value: "0", icon: Briefcase, color: "text-primary" },
    { label: "Documents", value: "0", icon: FileText, color: "text-accent" },
    { label: "Pending Tasks", value: "0", icon: Clock, color: "text-muted-foreground" },
    { label: "Completed", value: "0", icon: CheckCircle2, color: "text-emerald-600" },
  ];

  const quickActions = [
    { label: "My Services", description: "View and manage your active services", icon: Briefcase, path: "/portal/services" },
    { label: "Add Services", description: "Browse our catalogue and request more", icon: BookOpen, path: "/portal/catalogue" },
    { label: "Documents", description: "Access your files and agreements", icon: FileText, path: "/portal/documents" },
    { label: "Get Support", description: "Contact our team for assistance", icon: HelpCircle, path: "/portal/support" },
  ];

  const recentActivity = [
    { text: "Account created successfully", time: "Just now", icon: CheckCircle2 },
    { text: "Onboarding completed", time: "Just now", icon: TrendingUp },
    { text: "Welcome to Setlix", time: "Just now", icon: Bell },
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      {/* Welcome banner */}
      <div className="rounded-xl bg-primary p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
          <div className="w-full h-full border-[40px] border-primary-foreground rotate-45 translate-x-1/3 -translate-y-1/4" />
        </div>
        <div className="relative z-10">
          <p className="text-primary-foreground/70 text-sm font-medium mb-1">
            {greeting()},
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-2">
            {firstName || "Welcome back"}
          </h1>
          {nif && (
            <p className="text-primary-foreground/80 text-xs font-medium mb-2 tracking-wide">
              NIF: {nif}
            </p>
          )}
          <p className="text-primary-foreground/60 text-sm max-w-lg">
            Your client portal is ready. Here you can manage your services, access documents, and get support — all in one place.
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-4 md:p-5 space-y-2"
          >
            <div className="flex items-center justify-between">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="group text-left bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all duration-200"
              >
                <action.icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-foreground text-sm mb-1">{action.label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
                <div className="flex items-center gap-1 mt-3 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Open <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                <div className="mt-0.5 rounded-full bg-muted p-1.5">
                  <item.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium">{item.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
