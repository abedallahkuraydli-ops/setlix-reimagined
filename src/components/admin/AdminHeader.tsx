import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useNavigate } from "react-router-dom";
import { UnauthorisedAlertsBell } from "./UnauthorisedAlertsBell";
import { NotificationsBell } from "@/components/NotificationsBell";

export function AdminHeader() {
  const { user, signOut } = useAuth();
  const { isSuperadmin } = useRole();
  const navigate = useNavigate();

  const displayName = user?.user_metadata?.full_name || user?.email || "Admin";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary">
          {isSuperadmin ? "Superadmin Panel" : "Admin Panel (view-only)"}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <NotificationsBell />
        <UnauthorisedAlertsBell />
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border ml-1">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">{initials}</span>
          </div>
          <span className="text-sm text-foreground font-medium truncate max-w-[140px]">
            {displayName}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground ml-1">
          <LogOut className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Log Out</span>
        </Button>
      </div>
    </header>
  );
}
