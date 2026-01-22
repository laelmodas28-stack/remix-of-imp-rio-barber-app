import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CreditCard,
  BarChart3,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

export function FinanceOverviewPage() {
  const { barbershop } = useBarbershopContext();
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [periodFilter, setPeriodFilter] = useState("month");

  // Fetch bookings
  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ["finance-bookings", barbershop?.id, dateRange],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          professional:professionals!inner(barbershop_id, name),
          service:services(name, price)
        `)
        .eq("professional.barbershop_id", barbershop.id)
        .gte("booking_date", dateRange.start)
        .lte("booking_date", dateRange.end);
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  // Fetch commission payments (payouts)
  const { data: payouts, isLoading: loadingPayouts } = useQuery({
    queryKey: ["finance-payouts", barbershop?.id, dateRange],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("commission_payments")
        .select(`
          *,
          professional:professionals!inner(barbershop_id, name)
        `)
        .eq("professional.barbershop_id", barbershop.id)
        .gte("period_start", dateRange.start)
        .lte("period_end", dateRange.end);
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  // Fetch subscriptions
  const { data: subscriptions, isLoading: loadingSubscriptions } = useQuery({
    queryKey: ["finance-subscriptions", barbershop?.id, dateRange],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("client_subscriptions")
        .select(`
          *,
          plan:subscription_plans(name, price)
        `)
        .eq("barbershop_id", barbershop.id)
        .gte("start_date", dateRange.start)
        .lte("start_date", dateRange.end);
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  const isLoading = loadingBookings || loadingPayouts || loadingSubscriptions;

  // Calculate metrics
  const completedBookings = bookings?.filter(b => b.status === "completed") || [];
  const cancelledBookings = bookings?.filter(b => b.status === "cancelled") || [];
  
  const totalRevenue = completedBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
  const subscriptionRevenue = subscriptions?.reduce((sum, s) => sum + Number(s.plan?.price || 0), 0) || 0;
  const totalPayouts = payouts?.filter(p => p.status === "paid").reduce((sum, p) => sum + Number(p.commission_amount || 0), 0) || 0;
  const pendingPayouts = payouts?.filter(p => p.status === "pending").reduce((sum, p) => sum + Number(p.commission_amount || 0), 0) || 0;
  
  const grossRevenue = totalRevenue + subscriptionRevenue;
  const netRevenue = grossRevenue - totalPayouts;
  const averageTicket = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;
  const cancellationRate = bookings?.length ? (cancelledBookings.length / bookings.length) * 100 : 0;

  // Revenue by service
  const revenueByService = completedBookings.reduce((acc, booking) => {
    const serviceName = booking.service?.name || "Outros";
    acc[serviceName] = (acc[serviceName] || 0) + Number(booking.total_price || 0);
    return acc;
  }, {} as Record<string, number>);

  const serviceChartData = Object.entries(revenueByService)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Revenue by professional
  const revenueByProfessional = completedBookings.reduce((acc, booking) => {
    const profName = booking.professional?.name || "Outros";
    acc[profName] = (acc[profName] || 0) + Number(booking.total_price || 0);
    return acc;
  }, {} as Record<string, number>);

  const professionalChartData = Object.entries(revenueByProfessional)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Daily revenue for chart
  const dailyRevenue = completedBookings.reduce((acc, booking) => {
    const date = booking.booking_date;
    acc[date] = (acc[date] || 0) + Number(booking.total_price || 0);
    return acc;
  }, {} as Record<string, number>);

  const dailyChartData = Object.entries(dailyRevenue)
    .map(([date, value]) => ({ 
      date: format(new Date(date), "dd/MM", { locale: ptBR }), 
      value 
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const handlePeriodChange = (period: string) => {
    setPeriodFilter(period);
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (period) {
      case "7d":
        start = subDays(today, 7);
        break;
      case "30d":
        start = subDays(today, 30);
        break;
      case "month":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      default:
        start = startOfMonth(today);
        end = endOfMonth(today);
    }

    setDateRange({
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Visão Geral Financeira" subtitle="Análise completa das finanças" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral Financeira"
        subtitle="Análise completa das finanças da barbearia"
        actions={
          <Select value={periodFilter} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita Bruta</p>
                <p className="text-2xl font-bold">R$ {grossRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita Líquida</p>
                <p className="text-2xl font-bold">R$ {netRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">R$ {averageTicket.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa Cancelamento</p>
                <p className="text-2xl font-bold">{cancellationRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Receita Diária</TabsTrigger>
          <TabsTrigger value="services">Por Serviço</TabsTrigger>
          <TabsTrigger value="professionals">Por Profissional</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Receita por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyChartData.length === 0 ? (
                <div className="flex items-center justify-center h-80 text-muted-foreground">
                  Sem dados para o período selecionado
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Receita"]}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Receita por Serviço</CardTitle>
            </CardHeader>
            <CardContent>
              {serviceChartData.length === 0 ? (
                <div className="flex items-center justify-center h-80 text-muted-foreground">
                  Sem dados para o período selecionado
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={serviceChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Receita"]}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professionals">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Receita por Profissional</CardTitle>
            </CardHeader>
            <CardContent>
              {professionalChartData.length === 0 ? (
                <div className="flex items-center justify-center h-80 text-muted-foreground">
                  Sem dados para o período selecionado
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={professionalChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {professionalChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Receita"]}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Agendamentos</p>
                <p className="text-xl font-bold">{bookings?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Assinaturas</p>
                <p className="text-xl font-bold">{subscriptions?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Comissões Pendentes</p>
                <p className="text-xl font-bold">R$ {pendingPayouts.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default FinanceOverviewPage;
