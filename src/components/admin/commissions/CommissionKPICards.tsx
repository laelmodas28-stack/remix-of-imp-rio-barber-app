import { StatsCard } from "@/components/admin/shared/StatsCard";
import { DollarSign, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { CommissionKPIs } from "@/hooks/useCommissionItems";
import { Skeleton } from "@/components/ui/skeleton";

interface CommissionKPICardsProps {
  kpis: CommissionKPIs | undefined;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function CommissionKPICards({ kpis, isLoading }: CommissionKPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[120px] w-full" />
        ))}
      </div>
    );
  }

  const data = kpis || { totalGross: 0, totalCommission: 0, totalPaid: 0, totalPending: 0 };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Receita Bruta"
        value={formatCurrency(data.totalGross)}
        description="Total de serviços no período"
        icon={DollarSign}
      />
      <StatsCard
        title="Total de Comissões"
        value={formatCurrency(data.totalCommission)}
        description="Comissões calculadas"
        icon={TrendingUp}
      />
      <StatsCard
        title="Comissões Pagas"
        value={formatCurrency(data.totalPaid)}
        description="Já pagos aos profissionais"
        icon={CheckCircle}
      />
      <StatsCard
        title="Comissões Pendentes"
        value={formatCurrency(data.totalPending)}
        description="Aguardando pagamento"
        icon={Clock}
      />
    </div>
  );
}
