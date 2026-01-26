import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { toast } from "sonner";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";

export type PeriodPreset = 'day' | 'week' | 'month' | 'year' | 'custom';
export type PaymentStatusFilter = 'all' | 'PENDING' | 'PAID';

export interface CommissionFilters {
  periodPreset: PeriodPreset;
  startDate: string;
  endDate: string;
  professionalId: string;
  paymentStatus: PaymentStatusFilter;
  search: string;
}

export interface CommissionItem {
  id: string;
  barbershop_id: string;
  professional_id: string;
  booking_id: string | null;
  source_type: 'APPOINTMENT' | 'ORDER' | 'INVOICE' | 'OTHER';
  occurred_at: string;
  gross_amount: number;
  applied_commission_rate: number;
  commission_amount: number;
  payment_status: 'PENDING' | 'PAID';
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  professional?: {
    id: string;
    name: string;
    photo_url: string | null;
  };
}

export interface CommissionKPIs {
  totalGross: number;
  totalCommission: number;
  totalPaid: number;
  totalPending: number;
}

export function getDateRangeFromPreset(preset: PeriodPreset, customStart?: string, customEnd?: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  switch (preset) {
    case 'day':
      return { startDate: startOfDay(now), endDate: endOfDay(now) };
    case 'week':
      return { startDate: startOfWeek(now, { weekStartsOn: 1 }), endDate: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    case 'year':
      return { startDate: startOfYear(now), endDate: endOfYear(now) };
    case 'custom':
      return {
        startDate: customStart ? new Date(customStart) : startOfMonth(now),
        endDate: customEnd ? new Date(customEnd) : endOfMonth(now)
      };
    default:
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
  }
}

export function useCommissionItems(filters: CommissionFilters, page: number = 1, pageSize: number = 10) {
  const { barbershop } = useBarbershopContext();
  const barbershopId = barbershop?.id;

  const { startDate, endDate } = getDateRangeFromPreset(
    filters.periodPreset,
    filters.startDate,
    filters.endDate
  );

  return useQuery({
    queryKey: ["commission-items", barbershopId, filters, page, pageSize],
    queryFn: async () => {
      if (!barbershopId) return { items: [], count: 0 };

      let query = supabase
        .from("commission_items")
        .select(`
          *,
          professional:professionals!professional_id(id, name, photo_url)
        `, { count: 'exact' })
        .eq("barbershop_id", barbershopId)
        .gte("occurred_at", startDate.toISOString())
        .lte("occurred_at", endDate.toISOString())
        .order("occurred_at", { ascending: false });

      if (filters.professionalId && filters.professionalId !== 'all') {
        query = query.eq("professional_id", filters.professionalId);
      }

      if (filters.paymentStatus && filters.paymentStatus !== 'all') {
        query = query.eq("payment_status", filters.paymentStatus);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return { 
        items: (data as unknown as CommissionItem[]) || [], 
        count: count || 0 
      };
    },
    enabled: !!barbershopId,
  });
}

export function useCommissionKPIs(filters: CommissionFilters) {
  const { barbershop } = useBarbershopContext();
  const barbershopId = barbershop?.id;

  const { startDate, endDate } = getDateRangeFromPreset(
    filters.periodPreset,
    filters.startDate,
    filters.endDate
  );

  return useQuery({
    queryKey: ["commission-kpis", barbershopId, filters],
    queryFn: async (): Promise<CommissionKPIs> => {
      if (!barbershopId) {
        return { totalGross: 0, totalCommission: 0, totalPaid: 0, totalPending: 0 };
      }

      let query = supabase
        .from("commission_items")
        .select("gross_amount, commission_amount, payment_status")
        .eq("barbershop_id", barbershopId)
        .gte("occurred_at", startDate.toISOString())
        .lte("occurred_at", endDate.toISOString());

      if (filters.professionalId && filters.professionalId !== 'all') {
        query = query.eq("professional_id", filters.professionalId);
      }

      if (filters.paymentStatus && filters.paymentStatus !== 'all') {
        query = query.eq("payment_status", filters.paymentStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      const items = data || [];
      
      return {
        totalGross: items.reduce((sum, item) => sum + Number(item.gross_amount), 0),
        totalCommission: items.reduce((sum, item) => sum + Number(item.commission_amount), 0),
        totalPaid: items
          .filter(item => item.payment_status === 'PAID')
          .reduce((sum, item) => sum + Number(item.commission_amount), 0),
        totalPending: items
          .filter(item => item.payment_status === 'PENDING')
          .reduce((sum, item) => sum + Number(item.commission_amount), 0),
      };
    },
    enabled: !!barbershopId,
  });
}

export function useCommissionChartData(filters: CommissionFilters) {
  const { barbershop } = useBarbershopContext();
  const barbershopId = barbershop?.id;

  const { startDate, endDate } = getDateRangeFromPreset(
    filters.periodPreset,
    filters.startDate,
    filters.endDate
  );

  return useQuery({
    queryKey: ["commission-chart-data", barbershopId, filters],
    queryFn: async () => {
      if (!barbershopId) return { timeSeries: [], byProfessional: [], byStatus: [] };

      let query = supabase
        .from("commission_items")
        .select(`
          occurred_at,
          gross_amount,
          commission_amount,
          payment_status,
          professional:professionals!professional_id(id, name)
        `)
        .eq("barbershop_id", barbershopId)
        .gte("occurred_at", startDate.toISOString())
        .lte("occurred_at", endDate.toISOString());

      if (filters.professionalId && filters.professionalId !== 'all') {
        query = query.eq("professional_id", filters.professionalId);
      }

      if (filters.paymentStatus && filters.paymentStatus !== 'all') {
        query = query.eq("payment_status", filters.paymentStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      const items = data || [];

      // Time series grouping
      const timeSeriesMap = new Map<string, number>();
      items.forEach((item: any) => {
        const date = format(new Date(item.occurred_at), 'yyyy-MM-dd');
        timeSeriesMap.set(date, (timeSeriesMap.get(date) || 0) + Number(item.commission_amount));
      });
      const timeSeries = Array.from(timeSeriesMap.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // By professional (top 10 + Other)
      const professionalMap = new Map<string, { name: string; value: number }>();
      items.forEach((item: any) => {
        const name = item.professional?.name || 'Desconhecido';
        const existing = professionalMap.get(name) || { name, value: 0 };
        existing.value += Number(item.commission_amount);
        professionalMap.set(name, existing);
      });
      const byProfessional = Array.from(professionalMap.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // By status
      const paidTotal = items
        .filter((item: any) => item.payment_status === 'PAID')
        .reduce((sum: number, item: any) => sum + Number(item.commission_amount), 0);
      const pendingTotal = items
        .filter((item: any) => item.payment_status === 'PENDING')
        .reduce((sum: number, item: any) => sum + Number(item.commission_amount), 0);
      
      const byStatus = [
        { name: 'Pago', value: paidTotal },
        { name: 'Pendente', value: pendingTotal },
      ];

      return { timeSeries, byProfessional, byStatus };
    },
    enabled: !!barbershopId,
  });
}

export function useMarkCommissionPaid() {
  const { user } = useAuth();
  const { barbershop } = useBarbershopContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemIds, note }: { itemIds: string[]; note?: string }) => {
      if (!barbershop?.id || !user?.id) throw new Error("Não autorizado");

      // Update commission items
      const { error: updateError } = await supabase
        .from("commission_items")
        .update({ 
          payment_status: 'PAID' as any,
          paid_at: new Date().toISOString()
        })
        .in("id", itemIds)
        .eq("barbershop_id", barbershop.id);

      if (updateError) throw updateError;

      // Create payment log
      const { error: logError } = await supabase
        .from("commission_payment_logs")
        .insert({
          barbershop_id: barbershop.id,
          commission_item_ids: itemIds,
          paid_by_user_id: user.id,
          note: note || null,
        });

      if (logError) throw logError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-items"] });
      queryClient.invalidateQueries({ queryKey: ["commission-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["commission-chart-data"] });
      toast.success("Comissões marcadas como pagas");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao marcar comissões como pagas");
    },
  });
}
