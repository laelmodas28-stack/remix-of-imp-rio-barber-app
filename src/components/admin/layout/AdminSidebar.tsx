import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { getGroupedRoutes, isRouteActive, isGroupActive } from "@/config/adminRoutes";
import { ChevronRight, LogOut, Scissors } from "lucide-react";
const SIDEBAR_OPEN_GROUPS_KEY = "imperio-admin-sidebar-open-groups";

// Get initial open groups - runs only once on mount
function getInitialOpenGroups(currentPath: string, groupIds: string[]): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(SIDEBAR_OPEN_GROUPS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure the active group is open
      groupIds.forEach(groupId => {
        if (isGroupActive(currentPath, groupId)) {
          parsed[groupId] = true;
        }
      });
      return parsed;
    }
  } catch {}
  // Default: open the group containing the current route
  const initial: Record<string, boolean> = {};
  groupIds.forEach(groupId => {
    initial[groupId] = isGroupActive(currentPath, groupId);
  });
  return initial;
}
export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    state
  } = useSidebar();
  const {
    barbershop,
    baseUrl
  } = useBarbershopContext();
  const {
    user,
    signOut
  } = useAuth();
  const {
    userRole,
    isAdmin
  } = useUserRole(barbershop?.id);
  const collapsed = state === "collapsed";
  const adminBaseUrl = `${baseUrl}/admin`;

  // Extract path relative to admin base
  const currentPath = location.pathname.replace(`${adminBaseUrl}/`, "").replace(adminBaseUrl, "");

  // Determine user's effective role for filtering
  const effectiveRole = useMemo(() => {
    if (!userRole || userRole.length === 0) return 'barber';
    const role = userRole.find(r => r.barbershop_id === barbershop?.id);
    if (role?.role === 'super_admin') return 'super_admin';
    if (role?.role === 'admin') return 'admin';
    return 'barber';
  }, [userRole, barbershop?.id]);

  // Memoize grouped routes based on user role
  const {
    standalone,
    groups
  } = useMemo(() => getGroupedRoutes(effectiveRole), [effectiveRole]);
  const groupIds = useMemo(() => groups.map(g => g.id), [groups]);

  // Track which groups are open (persisted in localStorage)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => getInitialOpenGroups(currentPath, groupIds));

  // Track previous path to detect route changes
  const prevPathRef = useRef(currentPath);

  // Update open groups when route changes - only expand the active group
  useEffect(() => {
    if (prevPathRef.current !== currentPath) {
      prevPathRef.current = currentPath;

      // Find the active group and expand it
      const activeGroupId = groupIds.find(id => isGroupActive(currentPath, id));
      if (activeGroupId && !openGroups[activeGroupId]) {
        setOpenGroups(prev => ({
          ...prev,
          [activeGroupId]: true
        }));
      }
    }
  }, [currentPath, groupIds, openGroups]);

  // Persist open groups to localStorage (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(SIDEBAR_OPEN_GROUPS_KEY, JSON.stringify(openGroups));
      } catch {}
    }, 100);
    return () => clearTimeout(timeout);
  }, [openGroups]);
  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };
  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };
  const userInitials = user?.user_metadata?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || user?.email?.slice(0, 2).toUpperCase() || "U";
  const roleLabel = effectiveRole === "super_admin" ? "Super Admin" : effectiveRole === "admin" ? "Administrador" : "Barbeiro";

  // Get data-tour attribute for route
  const getTourId = (routeId: string) => {
    const tourMap: Record<string, string> = {
      dashboard: "sidebar-dashboard",
      agenda: "sidebar-agenda",
      clients: "sidebar-clients",
      professionals: "sidebar-professionals",
      services: "sidebar-services",
      finance: "sidebar-finance",
      subscriptions: "sidebar-subscriptions",
      reports: "sidebar-reports",
      imports: "sidebar-imports",
      notifications: "sidebar-notifications",
      settings: "sidebar-settings",
      help: "sidebar-help"
    };
    return tourMap[routeId];
  };
  return <Sidebar collapsible="icon" className="border-r border-border bg-sidebar" data-tour="sidebar">
      <SidebarHeader className="border-b border-border p-4">
        <Link to={baseUrl} className="flex items-center gap-3">
          {barbershop?.logo_url ? <img src={barbershop.logo_url} alt={barbershop.name} className="h-8 w-8 rounded-lg object-cover" /> : <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Scissors className="h-4 w-4 text-primary-foreground" />
            </div>}
          {!collapsed && <div className="flex flex-col">
              <span className="font-semibold text-sm text-sidebar-foreground truncate max-w-[140px]">
                {barbershop?.name || "Barbearia"}
              </span>
              <span className="text-xs text-muted-foreground">
                {effectiveRole === 'barber' ? 'Painel Barbeiro' : 'Painel Admin'}
              </span>
            </div>}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Standalone routes (Dashboard) */}
              {standalone.map(route => <SidebarMenuItem key={route.id} data-tour={getTourId(route.id)}>
                  <SidebarMenuButton asChild className={`${isRouteActive(currentPath, route.path) ? "bg-primary/10 text-primary font-medium" : "text-sidebar-foreground hover:bg-muted"}`}>
                    <Link to={`${adminBaseUrl}${route.path ? `/${route.path}` : ""}`}>
                      <route.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{route.label}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}

              {/* Grouped routes */}
              {groups.map(group => {
              const groupActive = isGroupActive(currentPath, group.id);
              const isOpen = openGroups[group.id] || groupActive;
              return <SidebarMenuItem key={group.id} data-tour={getTourId(group.id)}>
                    <Collapsible open={isOpen} onOpenChange={() => toggleGroup(group.id)}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className={`w-full justify-between ${groupActive ? "bg-accent text-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-muted"}`}>
                          <div className="flex items-center gap-3">
                            <group.icon className="h-4 w-4 shrink-0" />
                            {!collapsed && <span>{group.label}</span>}
                          </div>
                          {!collapsed && <ChevronRight className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {!collapsed && <CollapsibleContent>
                          <SidebarMenuSub>
                            {group.children.map(child => <SidebarMenuSubItem key={child.id}>
                                <SidebarMenuSubButton asChild className={`${isRouteActive(currentPath, child.path) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-sidebar-foreground hover:bg-muted"}`}>
                                  <Link to={`${adminBaseUrl}/${child.path}`}>
                                    <child.icon className="h-4 w-4 shrink-0" />
                                    <span>{child.label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>)}
                          </SidebarMenuSub>
                        </CollapsibleContent>}
                    </Collapsible>
                  </SidebarMenuItem>;
            })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
              </span>
              <Badge variant="secondary" className="w-fit text-xs">
                {roleLabel}
              </Badge>
            </div>}
          {!collapsed && <Button variant="ghost" size="icon" onClick={handleLogout} className="shrink-0 text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>}
        </div>
      </SidebarFooter>
    </Sidebar>;
}
export default AdminSidebar;