import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = 'admin' | 'super_admin' | 'barber' | 'client';

interface UserRoleData {
  id: string;
  user_id: string;
  barbershop_id: string | null;
  role: AppRole;
  created_at: string | null;
}

export const useUserRole = (barbershopId?: string) => {
  const { user } = useAuth();

  const { data: userRole, isLoading, error } = useQuery({
    queryKey: ["user-role", user?.id, barbershopId],
    queryFn: async (): Promise<UserRoleData[] | null> => {
      if (!user) return null;
      
      const query = supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id);
      
      if (barbershopId) {
        query.eq("barbershop_id", barbershopId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as UserRoleData[];
    },
    enabled: !!user,
  });

  const isAdminCheck = (shopId?: string): boolean => {
    if (!userRole) return false;
    if (shopId) {
      return userRole.some(
        role => (role.role === 'admin' || role.role === 'super_admin') && role.barbershop_id === shopId
      );
    }
    return userRole.some(role => role.role === 'admin' || role.role === 'super_admin');
  };

  const isSuperAdminCheck = (): boolean => {
    if (!userRole) return false;
    return userRole.some(role => role.role === 'super_admin');
  };

  const isBarberCheck = (shopId?: string): boolean => {
    if (!userRole) return false;
    if (shopId) {
      return userRole.some(
        role => role.role === 'barber' && role.barbershop_id === shopId
      );
    }
    return userRole.some(role => role.role === 'barber');
  };

  const isBarbershopOwner = (shopId: string): boolean => {
    return isAdminCheck(shopId);
  };

  // Get the effective role for a specific barbershop
  const getEffectiveRole = (shopId?: string): AppRole | null => {
    if (!userRole) return null;
    const targetShopId = shopId || barbershopId;
    if (!targetShopId) return null;
    
    const role = userRole.find(r => r.barbershop_id === targetShopId);
    return role?.role || null;
  };

  return { 
    userRole, 
    isLoading, 
    error, 
    isAdmin: isAdminCheck(barbershopId), 
    isSuperAdmin: isSuperAdminCheck(),
    isBarber: isBarberCheck(barbershopId),
    isBarbershopOwner,
    getEffectiveRole,
  };
};
