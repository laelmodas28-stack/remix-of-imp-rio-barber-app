import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PlatformPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_cycle: string;
  features: string[];
  max_professionals: number | null;
  max_services: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const usePlatformPlans = () => {
  const queryClient = useQueryClient();

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ["platform-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      
      if (error) throw error;
      
      return (data as unknown as PlatformPlan[]).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features as unknown as string || '[]'),
      }));
    },
  });

  const createCheckout = useMutation({
    mutationFn: async ({ planId, barbershopId }: { planId: string; barbershopId: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const { data, error } = await supabase.functions.invoke('create-asaas-checkout', {
        body: { planId, barbershopId },
      });

      if (error) {
        console.error('Checkout error:', error);
        if (error.message?.includes('ASAAS_NOT_CONFIGURED')) {
          throw new Error('Sistema de pagamento não configurado.');
        }
        throw new Error('Erro ao criar checkout. Tente novamente.');
      }

      if (!data?.invoiceUrl) {
        throw new Error('Erro ao obter link de pagamento');
      }

      return data as { paymentId: string; invoiceUrl: string; status: string };
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const refetchPlans = () => {
    queryClient.invalidateQueries({ queryKey: ["platform-plans"] });
  };

  return {
    plans,
    isLoading,
    error,
    createCheckout,
    refetchPlans,
  };
};
