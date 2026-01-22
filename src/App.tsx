import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import BarbershopLayout from "@/components/BarbershopLayout";
import Splash from "./pages/Splash";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import BarbershopAuth from "./pages/BarbershopAuth";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Professionals from "./pages/Professionals";
import ProfessionalDetail from "./pages/ProfessionalDetail";
import Booking from "./pages/Booking";
import Account from "./pages/Account";
import About from "./pages/About";
import Gallery from "./pages/Gallery";
import Subscriptions from "./pages/Subscriptions";
import RegisterBarbershop from "./pages/RegisterBarbershop";
import NotFound from "./pages/NotFound";

// Admin Layout & Pages
import AdminLayout from "./components/admin/layout/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import ClientsPage from "./pages/admin/ClientsPage";
import ReportsPage from "./pages/admin/ReportsPage";
import ImportsPage from "./pages/admin/ImportsPage";
import ImportWizardPage from "./pages/admin/ImportWizardPage";
import AdminNotFound from "./pages/admin/AdminNotFound";

// Agenda
import AppointmentsPage from "./pages/admin/agenda/AppointmentsPage";
import CalendarPage from "./pages/admin/agenda/CalendarPage";
import WaitingListPage from "./pages/admin/agenda/WaitingListPage";

// Clients
import ClientHistoryPage from "./pages/admin/clients/ClientHistoryPage";
import ClientSegmentsPage from "./pages/admin/clients/ClientSegmentsPage";
import ClientEditPage from "./pages/admin/clients/ClientEditPage";
// Professionals
import ProfessionalsListPage from "./pages/admin/professionals/ProfessionalsListPage";
import AvailabilityPage from "./pages/admin/professionals/AvailabilityPage";
import CommissionsPage from "./pages/admin/professionals/CommissionsPage";

// Services
import ServicesCatalogPage from "./pages/admin/services/ServicesCatalogPage";
import ServicesPricingPage from "./pages/admin/services/ServicesPricingPage";
import ServicesAddonsPage from "./pages/admin/services/ServicesAddonsPage";

// Finance
import FinanceOverviewPage from "./pages/admin/finance/FinanceOverviewPage";
import TransactionsPage from "./pages/admin/finance/TransactionsPage";
import CashflowPage from "./pages/admin/finance/CashflowPage";
import PayoutsPage from "./pages/admin/finance/PayoutsPage";

// Subscriptions
import SubscriptionPlansPage from "./pages/admin/subscriptions/SubscriptionPlansPage";
import InvoicesPage from "./pages/admin/subscriptions/InvoicesPage";
import SubscriptionStatusPage from "./pages/admin/subscriptions/SubscriptionStatusPage";

// Reports
import RevenueReportPage from "./pages/admin/reports/RevenueReportPage";
import AppointmentsReportPage from "./pages/admin/reports/AppointmentsReportPage";
import RetentionReportPage from "./pages/admin/reports/RetentionReportPage";
import ExportCenterPage from "./pages/admin/reports/ExportCenterPage";

// Imports
import ImportLogsPage from "./pages/admin/imports/ImportLogsPage";

// Notifications
import NotificationTemplatesPage from "./pages/admin/notifications/NotificationTemplatesPage";
import NotificationChannelsPage from "./pages/admin/notifications/NotificationChannelsPage";
import NotificationLogsPage from "./pages/admin/notifications/NotificationLogsPage";

// Settings
import BarbershopSettingsPage from "./pages/admin/settings/BarbershopSettingsPage";
import UsersRolesPage from "./pages/admin/settings/UsersRolesPage";
import PreferencesPage from "./pages/admin/settings/PreferencesPage";

// Help
import TutorialsPage from "./pages/admin/help/TutorialsPage";
import SupportPage from "./pages/admin/help/SupportPage";

// Super Admin
import SuperAdminLayout from "./pages/superadmin/SuperAdminLayout";
import SuperAdminLogin from "./pages/superadmin/SuperAdminLogin";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import BarbershopsPage from "./pages/superadmin/BarbershopsPage";
import SuperAdminSubscriptionsPage from "./pages/superadmin/SubscriptionsPage";
import LogsPage from "./pages/superadmin/LogsPage";

const queryClient = new QueryClient();

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-foreground mb-4">Algo deu errado</h1>
            <p className="text-muted-foreground mb-6">
              Ocorreu um erro inesperado. Tente recarregar a pagina.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Recarregar Pagina
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<LandingPage />} />

                <Route path="/b/:slug" element={<BarbershopLayout />}>
                  <Route index element={<Home />} />
                  <Route path="services" element={<Services />} />
                  <Route path="professionals" element={<Professionals />} />
                  <Route path="professionals/:id" element={<ProfessionalDetail />} />
                  <Route path="booking" element={<Booking />} />
                  <Route path="gallery" element={<Gallery />} />
                  <Route path="subscriptions" element={<Subscriptions />} />
                  <Route path="about" element={<About />} />
                  <Route path="auth" element={<BarbershopAuth />} />

                  {/* Admin routes */}
                  <Route path="admin" element={<AdminLayout />}>
                    <Route index element={<DashboardPage />} />
                    
                    {/* Agenda */}
                    <Route path="agenda/appointments" element={<AppointmentsPage />} />
                    <Route path="agenda/calendar" element={<CalendarPage />} />
                    <Route path="agenda/waiting-list" element={<WaitingListPage />} />
                    
                    {/* Clients */}
                    <Route path="clients/list" element={<ClientsPage />} />
                    <Route path="clients/:clientId" element={<ClientEditPage />} />
                    <Route path="clients/history" element={<ClientHistoryPage />} />
                    <Route path="clients/segments" element={<ClientSegmentsPage />} />
                    {/* Professionals */}
                    <Route path="professionals/list" element={<ProfessionalsListPage />} />
                    <Route path="professionals/availability" element={<AvailabilityPage />} />
                    <Route path="professionals/commissions" element={<CommissionsPage />} />
                    
                    {/* Services */}
                    <Route path="services/catalog" element={<ServicesCatalogPage />} />
                    <Route path="services/pricing" element={<ServicesPricingPage />} />
                    <Route path="services/add-ons" element={<ServicesAddonsPage />} />
                    
                    {/* Finance */}
                    <Route path="finance/overview" element={<FinanceOverviewPage />} />
                    <Route path="finance/transactions" element={<TransactionsPage />} />
                    <Route path="finance/cashflow" element={<CashflowPage />} />
                    <Route path="finance/payouts" element={<PayoutsPage />} />
                    
                    {/* Subscriptions */}
                    <Route path="subscriptions/plans" element={<SubscriptionPlansPage />} />
                    <Route path="subscriptions/invoices" element={<InvoicesPage />} />
                    <Route path="subscriptions/status" element={<SubscriptionStatusPage />} />
                    
                    {/* Reports */}
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="reports/revenue" element={<RevenueReportPage />} />
                    <Route path="reports/appointments" element={<AppointmentsReportPage />} />
                    <Route path="reports/retention" element={<RetentionReportPage />} />
                    <Route path="reports/export-center" element={<ExportCenterPage />} />
                    
                    {/* Imports */}
                    <Route path="imports" element={<ImportsPage />} />
                    <Route path="imports/:type" element={<ImportWizardPage />} />
                    <Route path="imports/logs" element={<ImportLogsPage />} />
                    
                    {/* Notifications */}
                    <Route path="notifications/templates" element={<NotificationTemplatesPage />} />
                    <Route path="notifications/channels" element={<NotificationChannelsPage />} />
                    <Route path="notifications/logs" element={<NotificationLogsPage />} />
                    
                    {/* Settings */}
                    <Route path="settings/barbershop" element={<BarbershopSettingsPage />} />
                    <Route path="settings/users-roles" element={<UsersRolesPage />} />
                    <Route path="settings/preferences" element={<PreferencesPage />} />
                    
                    {/* Help */}
                    <Route path="help/tutorials" element={<TutorialsPage />} />
                    <Route path="help/support" element={<SupportPage />} />
                    
                    {/* Admin 404 */}
                    <Route path="*" element={<AdminNotFound />} />
                  </Route>
                </Route>

                <Route path="/splash" element={<Splash />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/account" element={<Account />} />
                <Route path="/registro-barbeiro" element={<RegisterBarbershop />} />

                {/* Super Admin Routes */}
                <Route path="/superadmin/login" element={<SuperAdminLogin />} />
                <Route path="/superadmin" element={<SuperAdminLayout />}>
                  <Route index element={<SuperAdminDashboard />} />
                  <Route path="barbershops" element={<BarbershopsPage />} />
                  <Route path="subscriptions" element={<SuperAdminSubscriptionsPage />} />
                  <Route path="logs" element={<LogsPage />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
