import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  Tags,
  UserCircle,
  CalendarClock,
  Percent,
  Scissors,
  DollarSign,
  PackagePlus,
  Wallet,
  Receipt,
  TrendingUp,
  CreditCard,
  FileText,
  BarChart3,
  PieChart,
  UserCheck,
  Download,
  Bell,
  MessageSquare,
  Building,
  Shield,
  Settings,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export interface RouteConfig {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  parentId?: string;
  order: number;
  description?: string;
  // Role-based access: 'all' = everyone, 'admin' = admin only, 'barber' = barber only
  access?: 'all' | 'admin' | 'barber';
}

export interface RouteGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  order: number;
  children: RouteConfig[];
  // Role-based access for the entire group
  access?: 'all' | 'admin' | 'barber';
}

// Flat route config - single source of truth
export const adminRoutes: RouteConfig[] = [
  // Dashboard - Admin only
  { id: "dashboard", label: "Dashboard", path: "", icon: LayoutDashboard, order: 1, description: "Visao geral do negocio", access: "admin" },

  // Agenda - Barber sees only their own appointments
  { id: "appointments", label: "Agendamentos", path: "agenda/appointments", icon: Calendar, parentId: "agenda", order: 1, description: "Gerenciar agendamentos", access: "all" },
  { id: "calendar", label: "Calendario", path: "agenda/calendar", icon: CalendarDays, parentId: "agenda", order: 2, description: "Visualizacao em calendario", access: "all" },

  // Clients - Admin only
  { id: "clients-list", label: "Lista de Clientes", path: "clients/list", icon: Users, parentId: "clients", order: 1, description: "Todos os clientes cadastrados", access: "admin" },
  { id: "clients-segments", label: "Segmentos", path: "clients/segments", icon: Tags, parentId: "clients", order: 2, description: "Tags e segmentacao", access: "admin" },

  // Professionals - Admin only (team management)
  { id: "professionals-list", label: "Equipe", path: "professionals/list", icon: UserCircle, parentId: "professionals", order: 1, description: "Profissionais cadastrados", access: "admin" },
  { id: "professionals-availability", label: "Disponibilidade", path: "professionals/availability", icon: CalendarClock, parentId: "professionals", order: 2, description: "Horarios e escalas", access: "admin" },
  { id: "professionals-commissions", label: "Comissoes", path: "professionals/commissions", icon: Percent, parentId: "professionals", order: 3, description: "Regras de comissao", access: "admin" },

  // Services - Admin only
  { id: "services-catalog", label: "Catalogo", path: "services/catalog", icon: Scissors, parentId: "services", order: 1, description: "Servicos oferecidos", access: "admin" },
  { id: "services-pricing", label: "Precos", path: "services/pricing", icon: DollarSign, parentId: "services", order: 2, description: "Tabela de precos", access: "admin" },
  { id: "services-addons", label: "Adicionais", path: "services/add-ons", icon: PackagePlus, parentId: "services", order: 3, description: "Servicos complementares", access: "admin" },

  // Finance - Admin only
  { id: "finance-overview", label: "Visao Geral", path: "finance/overview", icon: Wallet, parentId: "finance", order: 1, description: "Resumo financeiro", access: "admin" },
  { id: "finance-transactions", label: "Transacoes", path: "finance/transactions", icon: Receipt, parentId: "finance", order: 2, description: "Historico de transacoes", access: "admin" },
  { id: "finance-cashflow", label: "Fluxo de Caixa", path: "finance/cashflow", icon: TrendingUp, parentId: "finance", order: 3, description: "Entradas e saidas", access: "admin" },
  { id: "finance-payouts", label: "Pagamentos", path: "finance/payouts", icon: CreditCard, parentId: "finance", order: 4, description: "Pagamentos realizados", access: "admin" },

  // Reports - Admin only
  { id: "reports-revenue", label: "Receita", path: "reports/revenue", icon: BarChart3, parentId: "reports", order: 1, description: "Relatorio de receita", access: "admin" },
  { id: "reports-appointments", label: "Agendamentos", path: "reports/appointments", icon: PieChart, parentId: "reports", order: 2, description: "Analise de agendamentos", access: "admin" },
  { id: "reports-retention", label: "Retencao", path: "reports/retention", icon: UserCheck, parentId: "reports", order: 3, description: "Retencao de clientes", access: "admin" },
  { id: "reports-export", label: "Central de Exportacao", path: "reports/export-center", icon: Download, parentId: "reports", order: 4, description: "Exportar dados", access: "admin" },

  // Notifications - Admin only
  { id: "notifications-templates", label: "Templates", path: "notifications/templates", icon: FileText, parentId: "notifications", order: 1, description: "Modelos de mensagens", access: "admin" },
  { id: "notifications-channels", label: "Canais", path: "notifications/channels", icon: MessageSquare, parentId: "notifications", order: 2, description: "WhatsApp, Email, SMS", access: "admin" },

  // Settings - Admin only
  { id: "settings-barbershop", label: "Perfil da Barbearia", path: "settings/barbershop", icon: Building, parentId: "settings", order: 1, description: "Dados do estabelecimento", access: "admin" },
  { id: "settings-users", label: "Equipe", path: "settings/users-roles", icon: Shield, parentId: "settings", order: 2, description: "Gerenciar acessos", access: "admin" },
  { id: "settings-preferences", label: "Preferencias", path: "settings/preferences", icon: Settings, parentId: "settings", order: 3, description: "Configuracoes gerais", access: "admin" },

  // Help - All users
  { id: "help-support", label: "Suporte", path: "help/support", icon: HelpCircle, parentId: "help", order: 1, description: "Entre em contato", access: "all" },
];

// Group definitions for sidebar
export const routeGroups: RouteGroup[] = [
  { id: "agenda", label: "Agenda", icon: Calendar, order: 2, children: [], access: "all" },
  { id: "clients", label: "Clientes", icon: Users, order: 3, children: [], access: "admin" },
  { id: "professionals", label: "Profissionais", icon: UserCircle, order: 4, children: [], access: "admin" },
  { id: "services", label: "Servicos", icon: Scissors, order: 5, children: [], access: "admin" },
  { id: "finance", label: "Financeiro", icon: Wallet, order: 6, children: [], access: "admin" },
  { id: "reports", label: "Relatorios", icon: BarChart3, order: 7, children: [], access: "admin" },
  { id: "notifications", label: "Notificacoes", icon: Bell, order: 8, children: [], access: "admin" },
  { id: "settings", label: "Configuracoes", icon: Settings, order: 9, children: [], access: "admin" },
  { id: "help", label: "Ajuda", icon: HelpCircle, order: 10, children: [], access: "all" },
];

// Build grouped routes for sidebar rendering
// Now accepts a role parameter to filter routes
export function getGroupedRoutes(userRole?: 'admin' | 'barber' | 'super_admin'): { standalone: RouteConfig[]; groups: RouteGroup[] } {
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  
  // Filter routes based on role
  const filteredRoutes = adminRoutes.filter(route => {
    if (!route.access || route.access === 'all') return true;
    if (route.access === 'admin' && isAdmin) return true;
    if (route.access === 'barber' && !isAdmin) return true;
    return false;
  });

  const standalone = filteredRoutes.filter((r) => !r.parentId).sort((a, b) => a.order - b.order);
  
  // Filter groups based on role and only include groups with children
  const groups = routeGroups
    .filter(group => {
      if (!group.access || group.access === 'all') return true;
      if (group.access === 'admin' && isAdmin) return true;
      if (group.access === 'barber' && !isAdmin) return true;
      return false;
    })
    .map((group) => ({
      ...group,
      children: filteredRoutes
        .filter((r) => r.parentId === group.id)
        .sort((a, b) => a.order - b.order),
    }))
    .filter(group => group.children.length > 0) // Only show groups with children
    .sort((a, b) => a.order - b.order);

  return { standalone, groups };
}

// Get route by path
export function getRouteByPath(path: string): RouteConfig | undefined {
  return adminRoutes.find((r) => r.path === path);
}

// Get parent group by route
export function getParentGroup(route: RouteConfig): RouteGroup | undefined {
  if (!route.parentId) return undefined;
  return routeGroups.find((g) => g.id === route.parentId);
}

// Get breadcrumb trail for a route
export function getBreadcrumbs(path: string): { label: string; path: string }[] {
  const route = getRouteByPath(path);
  if (!route) return [{ label: "Dashboard", path: "" }];

  const crumbs: { label: string; path: string }[] = [{ label: "Dashboard", path: "" }];

  if (route.parentId) {
    const group = routeGroups.find((g) => g.id === route.parentId);
    if (group) {
      // Add group without path (not navigable)
      crumbs.push({ label: group.label, path: "" });
    }
  }

  if (route.path !== "") {
    crumbs.push({ label: route.label, path: route.path });
  }

  return crumbs;
}

// Check if a path matches a route or is a child of a group
export function isRouteActive(currentPath: string, routePath: string): boolean {
  if (routePath === "") {
    return currentPath === "" || currentPath === "/";
  }
  return currentPath.startsWith(routePath);
}

export function isGroupActive(currentPath: string, groupId: string): boolean {
  return adminRoutes.some(
    (r) => r.parentId === groupId && isRouteActive(currentPath, r.path)
  );
}

// Check if a user has access to a specific route
export function canAccessRoute(path: string, userRole?: 'admin' | 'barber' | 'super_admin'): boolean {
  const route = getRouteByPath(path);
  if (!route) return false;
  
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  
  if (!route.access || route.access === 'all') return true;
  if (route.access === 'admin' && isAdmin) return true;
  if (route.access === 'barber' && !isAdmin) return true;
  
  return false;
}
