import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useBarbershopClients = (barbershopId?: string) => {
  const { data: clients, isLoading, error, refetch } = useQuery({
    queryKey: ["barbershop-clients", barbershopId],
    queryFn: async () => {
      if (!barbershopId) return [];
      
      const { data, error } = await supabase
        .from("barbershop_clients")
        .select(`
          *,
          profile:profiles!barbershop_clients_user_id_fkey (
            id,
            name,
            phone,
            avatar_url,
            email
          )
        `)
        .eq("barbershop_id", barbershopId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!barbershopId,
  });

  const getInactiveClients = (days: number = 30) => {
    if (!clients) return [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return clients.filter(client => {
      // Use created_at as fallback since last_visit doesn't exist
      return new Date(client.created_at) < cutoffDate;
    });
  };

  return { 
    clients, 
    isLoading, 
    error, 
    refetch,
    getInactiveClients 
  };
};
