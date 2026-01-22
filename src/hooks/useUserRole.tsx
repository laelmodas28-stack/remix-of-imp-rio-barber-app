import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUserRole = (barbershopId?: string) => {
  const { user } = useAuth();

  const { data: userRole, isLoading, error } = useQuery({
    queryKey: ["user-role", user?.id, barbershopId],
    queryFn: async () => {
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
      return data;
    },
    enabled: !!user,
  });

  const isAdmin = (barbershopId?: string) => {
    if (!userRole) return false;
    if (barbershopId) {
      return userRole.some(
        role => (role.role === 'admin' || role.role === 'super_admin') && role.barbershop_id === barbershopId
      );
    }
    return userRole.some(role => role.role === 'admin' || role.role === 'super_admin');
  };

  const isSuperAdmin = () => {
    if (!userRole) return false;
    return userRole.some(role => role.role === 'super_admin');
  };

  const isBarbershopOwner = (barbershopId: string) => {
    return isAdmin(barbershopId);
  };

  return { 
    userRole, 
    isLoading, 
    error, 
    isAdmin: isAdmin(), 
    isSuperAdmin: isSuperAdmin(),
    isBarbershopOwner 
  };
};
