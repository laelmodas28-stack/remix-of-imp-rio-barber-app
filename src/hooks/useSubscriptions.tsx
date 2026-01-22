import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

// Use database types directly
type SubscriptionPlan = Tables<"subscription_plans">;
type ClientSubscription = Tables<"client_subscriptions"> & {
  plan?: SubscriptionPlan;
  barbershop?: {
    name: string;
    logo_url: string | null;
  };
};

export type { SubscriptionPlan, ClientSubscription };

export const useSubscriptions = (barbershopId?: string) => {
  const { user } = useAuth();

  // Fetch available plans
  const { data: plans, isLoading: plansLoading, refetch: refetchPlans } = useQuery({
    queryKey: ["subscription-plans", barbershopId],
    queryFn: async () => {
      if (!barbershopId) return [];
      
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .eq("is_active", true)
        .order("price");
      
      if (error) throw error;
      return data;
    },
    enabled: !!barbershopId,
  });

  // Fetch client subscriptions
  const { data: clientSubscriptions, isLoading: subscriptionsLoading, refetch: refetchSubscriptions } = useQuery({
    queryKey: ["client-subscriptions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("client_subscriptions")
        .select(`
          *,
          plan:subscription_plans(*),
          barbershop:barbershops(name, logo_url)
        `)
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as unknown as ClientSubscription[];
    },
    enabled: !!user,
  });

  // Fetch all subscriptions (for admin)
  const { data: allSubscriptions, refetch: refetchAllSubscriptions } = useQuery({
    queryKey: ["all-subscriptions", barbershopId],
    queryFn: async () => {
      if (!barbershopId) return [];
      
      const { data, error } = await supabase
        .from("client_subscriptions")
        .select(`
          *,
          plan:subscription_plans(name, price),
          client:profiles(full_name, phone)
        `)
        .eq("barbershop_id", barbershopId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as unknown as (ClientSubscription & { client?: { full_name: string; phone: string } })[];
    },
    enabled: !!barbershopId,
  });

  const activeSubscription = clientSubscriptions?.find(
    sub => sub.status === 'active' && new Date(sub.end_date) >= new Date()
  );

  return {
    plans,
    plansLoading,
    refetchPlans,
    clientSubscriptions,
    subscriptionsLoading,
    refetchSubscriptions,
    activeSubscription,
    allSubscriptions,
    refetchAllSubscriptions,
  };
};