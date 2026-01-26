import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, RotateCcw, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CommissionFilters as FiltersType, PeriodPreset, PaymentStatusFilter } from "@/hooks/useCommissionItems";
import { useProfessionalsWithRates } from "@/hooks/useCommissionRates";

interface CommissionFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  onReset: () => void;
  dateError?: string;
}

const periodPresets: { value: PeriodPreset; label: string }[] = [
  { value: 'day', label: 'Hoje' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mês' },
  { value: 'year', label: 'Este ano' },
  { value: 'custom', label: 'Personalizado' },
];

const statusOptions: { value: PaymentStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos os status' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'PAID', label: 'Pago' },
];

export function CommissionFilters({ filters, onFiltersChange, onReset, dateError }: CommissionFiltersProps) {
  const { data: professionals = [] } = useProfessionalsWithRates();

  const handlePeriodChange = (value: PeriodPreset) => {
    onFiltersChange({ ...filters, periodPreset: value });
  };

  const handleProfessionalChange = (value: string) => {
    onFiltersChange({ ...filters, professionalId: value });
  };

  const handleStatusChange = (value: PaymentStatusFilter) => {
    onFiltersChange({ ...filters, paymentStatus: value });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      onFiltersChange({ ...filters, startDate: format(date, 'yyyy-MM-dd') });
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      onFiltersChange({ ...filters, endDate: format(date, 'yyyy-MM-dd') });
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {/* Period Preset */}
        <Select value={filters.periodPreset} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {periodPresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Range */}
        {filters.periodPreset === 'custom' && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[160px] justify-start text-left font-normal",
                    !filters.startDate && "text-muted-foreground",
                    dateError && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate ? format(new Date(filters.startDate), "dd/MM/yyyy") : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.startDate ? new Date(filters.startDate) : undefined}
                  onSelect={handleStartDateChange}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[160px] justify-start text-left font-normal",
                    !filters.endDate && "text-muted-foreground",
                    dateError && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate ? format(new Date(filters.endDate), "dd/MM/yyyy") : "Data fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.endDate ? new Date(filters.endDate) : undefined}
                  onSelect={handleEndDateChange}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </>
        )}

        {/* Professional Select */}
        <Select value={filters.professionalId} onValueChange={handleProfessionalChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Profissional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os profissionais</SelectItem>
            {professionals.map((prof) => (
              <SelectItem key={prof.id} value={prof.id}>
                {prof.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Payment Status */}
        <Select value={filters.paymentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={filters.search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>

        {/* Reset Button */}
        <Button variant="outline" size="icon" onClick={onReset} title="Limpar filtros">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {dateError && (
        <p className="text-sm text-destructive">{dateError}</p>
      )}
    </div>
  );
}
