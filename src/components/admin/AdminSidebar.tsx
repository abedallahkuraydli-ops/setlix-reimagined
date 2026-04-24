import { Users, BookOpen, Calendar, MessageSquare, Settings, Shield, ShieldCheck } from "lucide-react";
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
import { useRole } from "@/hooks/useRole";

const baseItems = [
  { title: "Clients", url: "/admin/clients", icon: Users },
  { title: "Services Catalogue", url: "/admin/services", icon: BookOpen, superOnly: true },
  { title: "Appointments", url: "/admin/appointments", icon: Calendar },
  { title: "Messages", url: "/admin/messages", icon: MessageSquare, superOnly: true },
  { title: "Admin Management", url: "/admin/admins", icon: ShieldCheck, superOnly: true },
  { title: "Settings", url: "/admin/settings", icon: Settings, superOnly: true },
  { title: "Breach Procedure", url: "/admin/breach-procedure", icon: Shield, superOnly: true },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const unread = useUnreadCount("admin");
  const { isSuperadmin } = useRole();
  const items = baseItems.filter((i) => !i.superOnly || isSuperadmin);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2 border-b border-sidebar-border mb-2">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-sidebar-foreground shrink-0" fill="currentColor" aria-hidden="true">
            <path d="M12 2 L13.2 9 L20 4.5 L15.5 11.3 L22 12 L15.5 12.7 L20 19.5 L13.2 15 L12 22 L10.8 15 L4 19.5 L8.5 12.7 L2 12 L8.5 11.3 L4 4.5 L10.8 9 Z" />
          </svg>
          {!collapsed && (
            <span className="text-sidebar-foreground font-bold text-lg tracking-wider">SETLIX</span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-widest font-semibold">
            Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const showBadge = item.url === "/admin/messages" && unread > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/admin/clients"}
                        className="hover:bg-sidebar-accent/50 transition-colors duration-150"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span className="flex-1">{item.title}</span>}
                        {showBadge && (
                          <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                            {unread > 99 ? "99+" : unread}
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
