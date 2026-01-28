import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { AdminTrialBanner } from "./AdminTrialBanner";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import BarbershopLoader from "@/components/BarbershopLoader";
import { canAccessRoute } from "@/config/adminRoutes";
import { useMemo } from "react";

export function AdminLayout() {
  const location = useLocation();
  const { barbershop, isLoading: barbershopLoading, baseUrl } = useBarbershopContext();
  const { user, loading: authLoading } = useAuth();
  const { userRole, isAdmin, isLoading: roleLoading } = useUserRole(barbershop?.id);
  const { trialExpired, hasActiveSubscription, isLoading: trialLoading } = useTrialStatus(barbershop?.id);

  const isLoading = barbershopLoading || authLoading || roleLoading || trialLoading;

  // Determine user's effective role
  const effectiveRole = useMemo(() => {
    if (!userRole || userRole.length === 0) return 'barber';
    const role = userRole.find(r => r.barbershop_id === barbershop?.id);
    if (role?.role === 'super_admin') return 'super_admin';
    if (role?.role === 'admin') return 'admin';
    if (role?.role === 'barber') return 'barber';
    return null; // No valid role for this barbershop
  }, [userRole, barbershop?.id]);

  // Check if user has a role in this barbershop (admin or barber)
  const hasAccess = useMemo(() => {
    if (!userRole || userRole.length === 0) return false;
    return userRole.some(r => 
      r.barbershop_id === barbershop?.id && 
      (r.role === 'admin' || r.role === 'super_admin' || r.role === 'barber')
    );
  }, [userRole, barbershop?.id]);

  // Get current route path relative to admin
  const adminBasePath = `${baseUrl}/admin`;
  const currentRoutePath = location.pathname.replace(`${adminBasePath}/`, "").replace(adminBasePath, "");

  if (isLoading) {
    return <BarbershopLoader />;
  }

  if (!user) {
    return <Navigate to={`/b/${barbershop?.slug}/auth`} replace />;
  }

  // If user has no role in this barbershop, redirect to main page
  if (!hasAccess) {
    return <Navigate to={`/b/${barbershop?.slug}`} replace />;
  }

  // Check if user can access the current route
  const canAccess = effectiveRole ? canAccessRoute(currentRoutePath, effectiveRole) : false;

  // If trying to access a restricted route, redirect to appropriate page
  if (!canAccess && currentRoutePath !== "") {
    // Barbers get redirected to their agenda
    if (effectiveRole === 'barber') {
      return <Navigate to={`${adminBasePath}/agenda/appointments`} replace />;
    }
    // Others get redirected to dashboard
    return <Navigate to={adminBasePath} replace />;
  }

  // If barber tries to access dashboard, redirect to agenda
  if (effectiveRole === 'barber' && (currentRoutePath === "" || currentRoutePath === "/")) {
    return <Navigate to={`${adminBasePath}/agenda/appointments`} replace />;
  }

  // CRITICAL: If trial expired and no active subscription - redirect to plans page
  // This blocks ALL admin access until payment is confirmed
  if (trialExpired && !hasActiveSubscription) {
    return <Navigate to={`/b/${barbershop?.slug}/plans`} replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <AdminTrialBanner />
          <AdminHeader />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default AdminLayout;
