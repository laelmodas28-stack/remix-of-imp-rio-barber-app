import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Award,
  Clock,
  BarChart3,
  XCircle,
  CalendarIcon,
  Filter,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isSameDay, isSameMonth, isSameYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import RevenueCharts from "./RevenueCharts";
import ProfessionalPerformance from "./ProfessionalPerformance";
import ServiceAnalysis from "./ServiceAnalysis";

interface Booking {
  id: string;
  price?: number | null;
  total_price?: number | null;
  booking_date: string;
  booking_time: string;
  status: string | null;
  professional?: { name: string } | null;
  professional_id: string | null;
  service?: { name: string } | null;
  service_id: string | null;
}

interface Professional {
  id: string;
  name: string;
  photo_url?: string | null;
  specialties?: string[] | null;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

interface FinancialDashboardProps {
  bookings: Booking[];
  professionals: Professional[];
  services: Service[];
}

type PeriodFilter = "7d" | "30d" | "month" | "3m" | "year" | "custom";
type CustomFilterType = "day" | "month" | "year" | null;

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const FinancialDashboard = ({
  bookings,
  professionals,
  services,
}: FinancialDashboardProps) => {
  const [period, setPeriod] = useState<PeriodFilter>("month");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [customFilterType, setCustomFilterType] = useState<CustomFilterType>(null);

  // Get available years - dynamic range from 2020 to current year + 5
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2020;
    const endYear = currentYear + 5;
    const years: number[] = [];
    
    for (let year = endYear; year >= startYear; year--) {
      years.push(year);
    }
    
    return years;
  }, []);

  // Handle quick filter selection
  const handleQuickFilter = (p: PeriodFilter) => {
    setPeriod(p);
    setCustomFilterType(null);
    setSelectedDate(undefined);
  };

  // Handle custom day filter
  const handleDaySelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setPeriod("custom");
      setCustomFilterType("day");
    }
  };

  // Handle custom month filter
  const handleMonthSelect = (month: string) => {
    setSelectedMonth(parseInt(month));
    setPeriod("custom");
    setCustomFilterType("month");
  };

  // Handle custom year filter
  const handleYearSelect = (year: string) => {
    setSelectedYear(parseInt(year));
    setPeriod("custom");
    setCustomFilterType("year");
  };

  // Clear custom filters
  const clearCustomFilters = () => {
    setSelectedDate(undefined);
    setCustomFilterType(null);
    setPeriod("month");
  };

  // Filtrar bookings por período
  const filteredBookings = useMemo(() => {
    const now = new Date();

    // Custom filters
    if (period === "custom" && customFilterType) {
      switch (customFilterType) {
        case "day":
          if (selectedDate) {
            return bookings.filter((b) => 
              isSameDay(new Date(b.booking_date), selectedDate)
            );
          }
          break;
        case "month":
          return bookings.filter((b) => {
            const bookingDate = new Date(b.booking_date);
            return bookingDate.getMonth() === selectedMonth && 
                   bookingDate.getFullYear() === selectedYear;
          });
        case "year":
          return bookings.filter((b) => {
            const bookingDate = new Date(b.booking_date);
            return bookingDate.getFullYear() === selectedYear;
          });
      }
    }

    // Quick filters
    let startDate: Date;
    switch (period) {
      case "7d":
        startDate = subDays(now, 7);
        break;
      case "30d":
        startDate = subDays(now, 30);
        break;
      case "month":
        startDate = startOfMonth(now);
        break;
      case "3m":
        startDate = subMonths(now, 3);
        break;
      case "year":
        startDate = startOfYear(now);
        break;
      default:
        startDate = startOfMonth(now);
    }

    return bookings.filter((b) => new Date(b.booking_date) >= startDate);
  }, [bookings, period, customFilterType, selectedDate, selectedMonth, selectedYear]);

  // Calcular métricas do período atual
  const currentMetrics = useMemo(() => {
    const completed = filteredBookings.filter((b) => b.status === "completed");
    const cancelled = filteredBookings.filter((b) => b.status === "cancelled");

    const totalRevenue = completed.reduce(
      (sum, b) => sum + Number(b.total_price || b.price || 0),
      0
    );
    const totalBookings = completed.length;
    const averageTicket = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const cancellationRate =
      filteredBookings.length > 0
        ? (cancelled.length / filteredBookings.length) * 100
        : 0;

    // Dia mais movimentado
    const dayCounts = completed.reduce((acc, booking) => {
      const day = format(new Date(booking.booking_date), "EEEE", {
        locale: ptBR,
      });
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const busiestDay = Object.entries(dayCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    // Horário de pico
    const hourCounts = completed.reduce((acc, booking) => {
      const hour = booking.booking_time.substring(0, 2);
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const peakHour = Object.entries(hourCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    // Top profissional
    const profCounts = completed.reduce((acc, booking) => {
      const name = booking.professional?.name || "Desconhecido";
      const revenue = acc[name] || { count: 0, revenue: 0 };
      revenue.count += 1;
      revenue.revenue += Number(booking.total_price || booking.price || 0);
      acc[name] = revenue;
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    const topProfessional = Object.entries(profCounts).sort(
      ([, a], [, b]) => b.revenue - a.revenue
    )[0];

    return {
      totalRevenue,
      totalBookings,
      averageTicket,
      cancellationRate,
      busiestDay,
      peakHour,
      topProfessional,
    };
  }, [filteredBookings]);

  // Calcular métricas do período anterior para comparação
  const previousMetrics = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case "7d":
        endDate = subDays(now, 7);
        startDate = subDays(now, 14);
        break;
      case "30d":
        endDate = subDays(now, 30);
        startDate = subDays(now, 60);
        break;
      case "month":
        const prevMonth = subMonths(now, 1);
        startDate = startOfMonth(prevMonth);
        endDate = endOfMonth(prevMonth);
        break;
      case "3m":
        endDate = subMonths(now, 3);
        startDate = subMonths(now, 6);
        break;
      case "year":
        endDate = subMonths(now, 12);
        startDate = subMonths(now, 24);
        break;
      default:
        const defaultPrevMonth = subMonths(now, 1);
        startDate = startOfMonth(defaultPrevMonth);
        endDate = endOfMonth(defaultPrevMonth);
    }

    const prevBookings = bookings.filter((b) => {
      const date = new Date(b.booking_date);
      return date >= startDate && date <= endDate;
    });

    const completed = prevBookings.filter((b) => b.status === "completed");
    const totalRevenue = completed.reduce(
      (sum, b) => sum + Number(b.total_price || b.price || 0),
      0
    );

    return { totalRevenue, totalBookings: completed.length };
  }, [bookings, period]);

  // Calcular crescimento
  const revenueGrowth =
    previousMetrics.totalRevenue > 0
      ? ((currentMetrics.totalRevenue - previousMetrics.totalRevenue) /
          previousMetrics.totalRevenue) *
        100
      : 0;

  const bookingsGrowth =
    previousMetrics.totalBookings > 0
      ? ((currentMetrics.totalBookings - previousMetrics.totalBookings) /
          previousMetrics.totalBookings) *
        100
      : 0;

  const getPeriodLabel = () => {
    if (period === "custom" && customFilterType) {
      switch (customFilterType) {
        case "day":
          return selectedDate 
            ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
            : "dia selecionado";
        case "month":
          return `${MONTHS[selectedMonth]} de ${selectedYear}`;
        case "year":
          return `ano ${selectedYear}`;
      }
    }
    switch (period) {
      case "7d":
        return "últimos 7 dias";
      case "30d":
        return "últimos 30 dias";
      case "month":
        return format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
      case "3m":
        return "últimos 3 meses";
      case "year":
        return `ano ${new Date().getFullYear()}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Dashboard Financeiro</h2>
            <p className="text-muted-foreground">
              Análise completa de {getPeriodLabel()}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["7d", "30d", "month", "3m", "year"] as PeriodFilter[]).map((p) => (
              <Button
                key={p}
                variant={period === p && !customFilterType ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuickFilter(p)}
              >
                {p === "7d" && "7 dias"}
                {p === "30d" && "30 dias"}
                {p === "month" && "Mês"}
                {p === "3m" && "3 meses"}
                {p === "year" && "Ano"}
              </Button>
            ))}
          </div>
        </div>

        {/* Filtros Avançados */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Filtros Avançados</span>
            </div>
            <div className="flex flex-wrap gap-4 items-end">
              {/* Filtro por Dia */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Dia Específico</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={customFilterType === "day" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "w-[160px] justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDaySelect}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      locale={ptBR}
                      captionLayout="dropdown-buttons"
                      fromYear={2020}
                      toYear={new Date().getFullYear() + 5}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro por Mês */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Mês</label>
                <Select 
                  value={customFilterType === "month" ? selectedMonth.toString() : ""} 
                  onValueChange={handleMonthSelect}
                >
                  <SelectTrigger className={cn(
                    "w-[140px]",
                    customFilterType === "month" && "border-primary"
                  )}>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Ano */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Ano</label>
                <Select 
                  value={customFilterType === "year" || customFilterType === "month" ? selectedYear.toString() : ""} 
                  onValueChange={handleYearSelect}
                >
                  <SelectTrigger className={cn(
                    "w-[120px]",
                    customFilterType === "year" && "border-primary"
                  )}>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Limpar Filtros */}
              {customFilterType && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearCustomFilters}
                  className="text-muted-foreground"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Faturamento Total */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Faturamento Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              R$ {currentMetrics.totalRevenue.toFixed(2)}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {revenueGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span
                className={
                  revenueGrowth >= 0 ? "text-green-500" : "text-red-500"
                }
              >
                {revenueGrowth >= 0 ? "+" : ""}
                {revenueGrowth.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs período anterior</span>
            </div>
          </CardContent>
        </Card>

        {/* Total de Atendimentos */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendimentos</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics.totalBookings}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {bookingsGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span
                className={
                  bookingsGrowth >= 0 ? "text-green-500" : "text-red-500"
                }
              >
                {bookingsGrowth >= 0 ? "+" : ""}
                {bookingsGrowth.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs período anterior</span>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {currentMetrics.averageTicket.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Por atendimento</p>
          </CardContent>
        </Card>

        {/* Taxa de Cancelamento */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelamentos</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics.cancellationRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Taxa de cancelamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Cards secundários */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Dia mais movimentado */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Dia Mais Movimentado
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {currentMetrics.busiestDay
                ? currentMetrics.busiestDay[0]
                : "Nenhum"}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentMetrics.busiestDay
                ? `${currentMetrics.busiestDay[1]} atendimentos`
                : "Sem dados"}
            </p>
          </CardContent>
        </Card>

        {/* Horário de Pico */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horário de Pico</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics.peakHour
                ? `${currentMetrics.peakHour[0]}:00`
                : "Nenhum"}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentMetrics.peakHour
                ? `${currentMetrics.peakHour[1]} atendimentos`
                : "Sem dados"}
            </p>
          </CardContent>
        </Card>

        {/* Top Profissional */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Profissional Destaque
            </CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {currentMetrics.topProfessional
                ? currentMetrics.topProfessional[0]
                : "Nenhum"}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentMetrics.topProfessional
                ? `R$ ${currentMetrics.topProfessional[1].revenue.toFixed(2)} em ${currentMetrics.topProfessional[1].count} atendimentos`
                : "Sem dados"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com detalhes */}
      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="charts">
            <BarChart3 className="w-4 h-4 mr-2" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="w-4 h-4 mr-2" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="services">
            <DollarSign className="w-4 h-4 mr-2" />
            Serviços
          </TabsTrigger>
        </TabsList>

        <TabsContent value="charts">
          <RevenueCharts bookings={bookings} />
        </TabsContent>

        <TabsContent value="team">
          <ProfessionalPerformance
            bookings={filteredBookings}
            professionals={professionals}
          />
        </TabsContent>

        <TabsContent value="services">
          <ServiceAnalysis
            bookings={filteredBookings}
            services={services}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialDashboard;
