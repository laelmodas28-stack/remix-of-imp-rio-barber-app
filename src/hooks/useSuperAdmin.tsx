import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useSuperAdmin = () => {
  const { user } = useAuth();

  const { data: isSuperAdmin, isLoading } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      if (error) {
        console.error("Error checking super admin status:", error);
        return false;
      }

      return !!data;
    },
    enabled: !!user,
  });

  return {
    isSuperAdmin: isSuperAdmin ?? false,
    isLoading,
  };
};
