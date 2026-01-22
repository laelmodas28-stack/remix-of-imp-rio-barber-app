import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useBarbershop = () => {
  const { user } = useAuth();

  const { data: barbershop, isLoading, error } = useQuery({
    queryKey: ["barbershop", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Primeiro, buscar se o usuário é admin de alguma barbearia
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("barbershop_id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .not("barbershop_id", "is", null)
        .limit(1)
        .maybeSingle();
      
      if (rolesError) throw rolesError;
      if (!userRoles) return null;
      
      // Buscar dados da barbearia
      const { data, error } = await supabase
        .from("barbershops")
        .select("*")
        .eq("id", userRoles.barbershop_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { barbershop, isLoading, error };
};
