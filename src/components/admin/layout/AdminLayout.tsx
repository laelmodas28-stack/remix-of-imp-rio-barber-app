import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Outlet, Navigate } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import BarbershopLoader from "@/components/BarbershopLoader";

export function AdminLayout() {
  const { barbershop, isLoading: barbershopLoading } = useBarbershopContext();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole(barbershop?.id);

  const isLoading = barbershopLoading || authLoading || roleLoading;

  if (isLoading) {
    return <BarbershopLoader />;
  }

  if (!user) {
    return <Navigate to={`/b/${barbershop?.slug}/auth`} replace />;
  }

  if (!isAdmin) {
    return <Navigate to={`/b/${barbershop?.slug}`} replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
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
