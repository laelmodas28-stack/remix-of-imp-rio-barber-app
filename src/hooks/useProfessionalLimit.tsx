import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProfessionalLimitResult {
  currentCount: number;
  maxAllowed: number | null; // null = unlimited
  canAddMore: boolean;
  planName: string;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to check if a barbershop can add more professionals based on their subscription plan.
 * 
 * Plan limits:
 * - Essencial: 1 professional
 * - Profissional: 3 professionals
 * - Completo: Unlimited
 * - Trial: 1 professional (same as Essencial)
 */
export const useProfessionalLimit = (barbershopId: string | undefined): ProfessionalLimitResult => {
  // Fetch current professional count
  const { data: professionals, isLoading: loadingProfessionals, error: profError } = useQuery({
    queryKey: ["professionals-count", barbershopId],
    queryFn: async () => {
      if (!barbershopId) return [];
      const { data, error } = await supabase
        .from("professionals")
        .select("id")
        .eq("barbershop_id", barbershopId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershopId,
  });

  // Fetch subscription plan
  const { data: subscription, isLoading: loadingSubscription, error: subError } = useQuery({
    queryKey: ["barbershop-subscription", barbershopId],
    queryFn: async () => {
      if (!barbershopId) return null;
      const { data, error } = await supabase
        .from("barbershop_subscriptions")
        .select("plan_type, status")
        .eq("barbershop_id", barbershopId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!barbershopId,
  });

  const currentCount = professionals?.length || 0;
  const planType = subscription?.plan_type?.toLowerCase() || "trial";
  
  // Determine max professionals based on plan
  const getMaxProfessionals = (plan: string): number | null => {
    switch (plan) {
      case "essencial":
      case "basic":
      case "trial":
        return 1;
      case "profissional":
      case "professional":
        return 3;
      case "completo":
      case "enterprise":
      case "complete":
        return null; // Unlimited
      default:
        return 1; // Default to most restrictive
    }
  };

  const getPlanDisplayName = (plan: string): string => {
    switch (plan) {
      case "essencial":
      case "basic":
        return "Essencial";
      case "profissional":
      case "professional":
        return "Profissional";
      case "completo":
      case "enterprise":
      case "complete":
        return "Completo";
      case "trial":
        return "Trial";
      default:
        return plan;
    }
  };

  const maxAllowed = getMaxProfessionals(planType);
  const canAddMore = maxAllowed === null || currentCount < maxAllowed;
  const planName = getPlanDisplayName(planType);

  return {
    currentCount,
    maxAllowed,
    canAddMore,
    planName,
    isLoading: loadingProfessionals || loadingSubscription,
    error: profError || subError,
  };
};

/**
 * Get the limit message to display to the user
 */
export const getProfessionalLimitMessage = (
  currentCount: number,
  maxAllowed: number | null,
  planName: string
): string => {
  if (maxAllowed === null) {
    return `Plano ${planName}: Profissionais ilimitados`;
  }
  
  if (currentCount >= maxAllowed) {
    return `Limite atingido! O plano ${planName} permite apenas ${maxAllowed} profissional${maxAllowed > 1 ? 'is' : ''}. Faça upgrade para adicionar mais.`;
  }
  
  return `Plano ${planName}: ${currentCount}/${maxAllowed} profissional${maxAllowed > 1 ? 'is' : ''}`;
};
