import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent, Settings } from "lucide-react";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { useUserRole } from "@/hooks/useUserRole";
import { CommissionFilters } from "@/components/admin/commissions/CommissionFilters";
import { CommissionKPICards } from "@/components/admin/commissions/CommissionKPICards";
import { CommissionCharts } from "@/components/admin/commissions/CommissionCharts";
import { CommissionItemsTable } from "@/components/admin/commissions/CommissionItemsTable";
import { ProfessionalRatesTab } from "@/components/admin/commissions/ProfessionalRatesTab";
import { 
  CommissionFilters as FiltersType, 
  useCommissionItems, 
  useCommissionKPIs,
  useCommissionChartData,
  getDateRangeFromPreset
} from "@/hooks/useCommissionItems";
import { format } from "date-fns";

const defaultFilters: FiltersType = {
  periodPreset: 'month',
  startDate: '',
  endDate: '',
  professionalId: 'all',
  paymentStatus: 'all',
  search: '',
};

export function CommissionsPage() {
  const { barbershop } = useBarbershopContext();
  const { isAdmin } = useUserRole(barbershop?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize filters from URL or defaults
  const [filters, setFilters] = useState<FiltersType>(() => {
    const preset = searchParams.get('period') as FiltersType['periodPreset'] || 'month';
    const { startDate, endDate } = getDateRangeFromPreset(preset);
    
    return {
      periodPreset: preset,
      startDate: searchParams.get('startDate') || format(startDate, 'yyyy-MM-dd'),
      endDate: searchParams.get('endDate') || format(endDate, 'yyyy-MM-dd'),
      professionalId: searchParams.get('professional') || 'all',
      paymentStatus: (searchParams.get('status') as FiltersType['paymentStatus']) || 'all',
      search: searchParams.get('search') || '',
    };
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateError, setDateError] = useState<string>();

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.periodPreset !== 'month') params.set('period', filters.periodPreset);
    if (filters.periodPreset === 'custom') {
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
    }
    if (filters.professionalId !== 'all') params.set('professional', filters.professionalId);
    if (filters.paymentStatus !== 'all') params.set('status', filters.paymentStatus);
    if (filters.search) params.set('search', filters.search);
    
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Validate custom date range
  useEffect(() => {
    if (filters.periodPreset === 'custom' && filters.startDate && filters.endDate) {
      if (new Date(filters.startDate) > new Date(filters.endDate)) {
        setDateError("A data inicial deve ser anterior à data final");
      } else {
        setDateError(undefined);
      }
    } else {
      setDateError(undefined);
    }
  }, [filters.periodPreset, filters.startDate, filters.endDate]);

  // Queries
  const { data: itemsData, isLoading: itemsLoading } = useCommissionItems(filters, page, pageSize);
  const { data: kpis, isLoading: kpisLoading } = useCommissionKPIs(filters);
  const { data: chartData, isLoading: chartsLoading } = useCommissionChartData(filters);

  const handleFiltersChange = (newFilters: FiltersType) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page on filter change
  };

  const handleResetFilters = () => {
    const { startDate, endDate } = getDateRangeFromPreset('month');
    setFilters({
      ...defaultFilters,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    });
    setPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Percent className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comissões</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie comissões e taxas dos profissionais
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="rates">
              <Settings className="mr-2 h-4 w-4" />
              Gerenciar Taxas
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Filters */}
          <CommissionFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleResetFilters}
            dateError={dateError}
          />

          {/* KPI Cards */}
          <CommissionKPICards kpis={kpis} isLoading={kpisLoading} />

          {/* Charts (Admin only) */}
          {isAdmin && (
            <CommissionCharts data={chartData} isLoading={chartsLoading} />
          )}

          {/* Table */}
          <CommissionItemsTable
            items={itemsData?.items || []}
            count={itemsData?.count || 0}
            isLoading={itemsLoading}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            isAdmin={isAdmin}
          />
        </TabsContent>

        {/* Rate Management Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="rates">
            <ProfessionalRatesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default CommissionsPage;
