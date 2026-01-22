import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Clock,
  Users,
  History,
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
  Crown,
  FileText,
  Activity,
  BarChart3,
  PieChart,
  UserCheck,
  Download,
  Upload,
  FileWarning,
  Bell,
  MessageSquare,
  Send,
  Building,
  Shield,
  
  Settings,
  Video,
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
}

export interface RouteGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  order: number;
  children: RouteConfig[];
}

// Flat route config - single source of truth
export const adminRoutes: RouteConfig[] = [
  // Dashboard
  { id: "dashboard", label: "Dashboard", path: "", icon: LayoutDashboard, order: 1, description: "Visao geral do negocio" },

  // Agenda
  { id: "appointments", label: "Agendamentos", path: "agenda/appointments", icon: Calendar, parentId: "agenda", order: 1, description: "Gerenciar agendamentos" },
  { id: "calendar", label: "Calendario", path: "agenda/calendar", icon: CalendarDays, parentId: "agenda", order: 2, description: "Visualizacao em calendario" },

  // Clients
  { id: "clients-list", label: "Lista de Clientes", path: "clients/list", icon: Users, parentId: "clients", order: 1, description: "Todos os clientes cadastrados" },
  { id: "clients-segments", label: "Segmentos", path: "clients/segments", icon: Tags, parentId: "clients", order: 2, description: "Tags e segmentacao" },

  // Professionals
  { id: "professionals-list", label: "Equipe", path: "professionals/list", icon: UserCircle, parentId: "professionals", order: 1, description: "Profissionais cadastrados" },
  { id: "professionals-availability", label: "Disponibilidade", path: "professionals/availability", icon: CalendarClock, parentId: "professionals", order: 2, description: "Horarios e escalas" },
  { id: "professionals-commissions", label: "Comissoes", path: "professionals/commissions", icon: Percent, parentId: "professionals", order: 3, description: "Regras de comissao" },

  // Services
  { id: "services-catalog", label: "Catalogo", path: "services/catalog", icon: Scissors, parentId: "services", order: 1, description: "Servicos oferecidos" },
  { id: "services-pricing", label: "Precos", path: "services/pricing", icon: DollarSign, parentId: "services", order: 2, description: "Tabela de precos" },
  { id: "services-addons", label: "Adicionais", path: "services/add-ons", icon: PackagePlus, parentId: "services", order: 3, description: "Servicos complementares" },

  // Finance
  { id: "finance-overview", label: "Visao Geral", path: "finance/overview", icon: Wallet, parentId: "finance", order: 1, description: "Resumo financeiro" },
  { id: "finance-transactions", label: "Transacoes", path: "finance/transactions", icon: Receipt, parentId: "finance", order: 2, description: "Historico de transacoes" },
  { id: "finance-cashflow", label: "Fluxo de Caixa", path: "finance/cashflow", icon: TrendingUp, parentId: "finance", order: 3, description: "Entradas e saidas" },
  { id: "finance-payouts", label: "Pagamentos", path: "finance/payouts", icon: CreditCard, parentId: "finance", order: 4, description: "Pagamentos realizados" },

  // Reports
  { id: "reports-revenue", label: "Receita", path: "reports/revenue", icon: BarChart3, parentId: "reports", order: 1, description: "Relatorio de receita" },
  { id: "reports-appointments", label: "Agendamentos", path: "reports/appointments", icon: PieChart, parentId: "reports", order: 2, description: "Analise de agendamentos" },
  { id: "reports-retention", label: "Retencao", path: "reports/retention", icon: UserCheck, parentId: "reports", order: 3, description: "Retencao de clientes" },
  { id: "reports-export", label: "Central de Exportacao", path: "reports/export-center", icon: Download, parentId: "reports", order: 4, description: "Exportar dados" },

  // Notifications
  { id: "notifications-templates", label: "Templates", path: "notifications/templates", icon: FileText, parentId: "notifications", order: 1, description: "Modelos de mensagens" },
  { id: "notifications-channels", label: "Canais", path: "notifications/channels", icon: MessageSquare, parentId: "notifications", order: 2, description: "WhatsApp, Email, SMS" },

  // Settings
  { id: "settings-barbershop", label: "Perfil da Barbearia", path: "settings/barbershop", icon: Building, parentId: "settings", order: 1, description: "Dados do estabelecimento" },
  { id: "settings-users", label: "Usuarios e Funcoes", path: "settings/users-roles", icon: Shield, parentId: "settings", order: 2, description: "Gerenciar acessos" },
  { id: "settings-preferences", label: "Preferencias", path: "settings/preferences", icon: Settings, parentId: "settings", order: 3, description: "Configuracoes gerais" },

  // Help
  { id: "help-support", label: "Suporte", path: "help/support", icon: HelpCircle, parentId: "help", order: 1, description: "Entre em contato" },
];

// Group definitions for sidebar
export const routeGroups: RouteGroup[] = [
  { id: "agenda", label: "Agenda", icon: Calendar, order: 2, children: [] },
  { id: "clients", label: "Clientes", icon: Users, order: 3, children: [] },
  { id: "professionals", label: "Profissionais", icon: UserCircle, order: 4, children: [] },
  { id: "services", label: "Servicos", icon: Scissors, order: 5, children: [] },
  { id: "finance", label: "Financeiro", icon: Wallet, order: 6, children: [] },
  { id: "reports", label: "Relatorios", icon: BarChart3, order: 7, children: [] },
  { id: "notifications", label: "Notificacoes", icon: Bell, order: 8, children: [] },
  { id: "settings", label: "Configuracoes", icon: Settings, order: 9, children: [] },
  { id: "help", label: "Ajuda", icon: HelpCircle, order: 10, children: [] },
];

// Build grouped routes for sidebar rendering
export function getGroupedRoutes(): { standalone: RouteConfig[]; groups: RouteGroup[] } {
  const standalone = adminRoutes.filter((r) => !r.parentId).sort((a, b) => a.order - b.order);
  
  const groups = routeGroups.map((group) => ({
    ...group,
    children: adminRoutes
      .filter((r) => r.parentId === group.id)
      .sort((a, b) => a.order - b.order),
  })).sort((a, b) => a.order - b.order);

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
