import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { toast } from "sonner";

export interface ProfessionalWithRate {
  id: string;
  name: string;
  photo_url: string | null;
  commission_rate: number;
  commission_updated_at: string | null;
}

export interface RateHistoryEntry {
  id: string;
  professional_id: string;
  old_rate_percent: number | null;
  new_rate_percent: number;
  changed_at: string;
  changed_by_user_id: string;
  professional?: {
    name: string;
  };
}

export function useProfessionalsWithRates() {
  const { barbershop } = useBarbershopContext();
  const barbershopId = barbershop?.id;

  return useQuery({
    queryKey: ["professionals-with-rates", barbershopId],
    queryFn: async (): Promise<ProfessionalWithRate[]> => {
      if (!barbershopId) return [];

      // Get professionals
      const { data: professionals, error: profError } = await supabase
        .from("professionals")
        .select("id, name, photo_url, commission_percentage")
        .eq("barbershop_id", barbershopId)
        .eq("is_active", true)
        .order("name");

      if (profError) throw profError;

      // Get commission rates from professional_commissions table
      const { data: commissions, error: commError } = await supabase
        .from("professional_commissions")
        .select("professional_id, commission_rate, updated_at")
        .eq("barbershop_id", barbershopId);

      if (commError) throw commError;

      // Merge data
      const commissionMap = new Map(
        (commissions || []).map(c => [c.professional_id, c])
      );

      return (professionals || []).map(p => ({
        id: p.id,
        name: p.name,
        photo_url: p.photo_url,
        commission_rate: commissionMap.get(p.id)?.commission_rate ?? p.commission_percentage ?? 0,
        commission_updated_at: commissionMap.get(p.id)?.updated_at || null,
      }));
    },
    enabled: !!barbershopId,
  });
}

export function useRateHistory(professionalId?: string) {
  const { barbershop } = useBarbershopContext();
  const barbershopId = barbershop?.id;

  return useQuery({
    queryKey: ["rate-history", barbershopId, professionalId],
    queryFn: async (): Promise<RateHistoryEntry[]> => {
      if (!barbershopId) return [];

      let query = supabase
        .from("commission_rate_history")
        .select(`
          *,
          professional:professionals!professional_id(name)
        `)
        .eq("barbershop_id", barbershopId)
        .order("changed_at", { ascending: false })
        .limit(50);

      if (professionalId) {
        query = query.eq("professional_id", professionalId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data as unknown as RateHistoryEntry[]) || [];
    },
    enabled: !!barbershopId,
  });
}

export function useUpdateCommissionRate() {
  const { user } = useAuth();
  const { barbershop } = useBarbershopContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ professionalId, newRate, oldRate }: { 
      professionalId: string; 
      newRate: number; 
      oldRate: number;
    }) => {
      if (!barbershop?.id || !user?.id) throw new Error("Não autorizado");

      // Upsert commission rate
      const { error: upsertError } = await supabase
        .from("professional_commissions")
        .upsert({
          professional_id: professionalId,
          barbershop_id: barbershop.id,
          commission_rate: newRate,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'professional_id,barbershop_id'
        });

      if (upsertError) throw upsertError;

      // Also update the legacy field on professionals table
      const { error: profError } = await supabase
        .from("professionals")
        .update({ commission_percentage: newRate })
        .eq("id", professionalId);

      if (profError) throw profError;

      // Create history entry
      const { error: historyError } = await supabase
        .from("commission_rate_history")
        .insert({
          professional_id: professionalId,
          barbershop_id: barbershop.id,
          old_rate_percent: oldRate,
          new_rate_percent: newRate,
          changed_by_user_id: user.id,
        });

      if (historyError) throw historyError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals-with-rates"] });
      queryClient.invalidateQueries({ queryKey: ["rate-history"] });
      toast.success("Taxa de comissão atualizada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar taxa de comissão");
    },
  });
}
