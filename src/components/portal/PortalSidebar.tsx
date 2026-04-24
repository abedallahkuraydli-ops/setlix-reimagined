import {
  LayoutDashboard,
  Briefcase,
  BookOpen,
  FileText,
  FileSignature,
  CreditCard,
  Receipt,
  MessageSquare,
  CalendarClock,
  HelpCircle,
  Settings,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useUpcomingAppointmentsCount } from "@/hooks/useUpcomingAppointmentsCount";

const items = [
  { title: "Dashboard", url: "/portal/dashboard", icon: LayoutDashboard },
  { title: "Contract", url: "/portal/contract", icon: FileSignature },
  { title: "My Services", url: "/portal/services", icon: Briefcase },
  { title: "Services Catalogue", url: "/portal/catalogue", icon: BookOpen },
  { title: "Documents", url: "/portal/documents", icon: FileText },
  { title: "Payments", url: "/portal/payments", icon: CreditCard },
  { title: "Invoices", url: "/portal/invoices", icon: Receipt },
  { title: "Messages", url: "/portal/messages", icon: MessageSquare },
  { title: "Appointments", url: "/portal/appointments", icon: CalendarClock },
  { title: "Support", url: "/portal/support", icon: HelpCircle },
  { title: "Settings", url: "/portal/settings", icon: Settings },
];

export function PortalSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const unread = useUnreadCount("client");
  const upcomingAppts = useUpcomingAppointmentsCount();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2 border-b border-sidebar-border mb-2">
          <span className="text-sidebar-foreground font-black text-2xl leading-none">✳</span>
          {!collapsed && (
            <span className="text-sidebar-foreground font-bold text-lg tracking-wider">SETLIX</span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-widest font-semibold">
            Portal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isMessages = item.url === "/portal/messages";
                const isAppts = item.url === "/portal/appointments";
                const badgeCount = isMessages ? unread : isAppts ? upcomingAppts : 0;
                const showBadge = badgeCount > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-sidebar-accent/50 transition-colors duration-150"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span className="flex-1">{item.title}</span>}
                        {showBadge && (
                          <span className={`ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-white text-[10px] font-bold ${isMessages ? "bg-amber-500" : "bg-primary"}`}>
                            {badgeCount > 99 ? "99+" : badgeCount}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
