import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Download, Calendar, Loader2 } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, subMonths, parseISO, isSameDay, isSameWeek, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

type Period = "7d" | "30d" | "90d" | "12m";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export function RevenueReportPage() {
  const { barbershop } = useBarbershopContext();
  const [period, setPeriod] = useState<Period>("30d");

  const dateRange = useMemo(() => {
    const end = new Date();
    let start: Date;
    switch (period) {
      case "7d": start = subDays(end, 7); break;
      case "30d": start = subDays(end, 30); break;
      case "90d": start = subDays(end, 90); break;
      case "12m": start = subMonths(end, 12); break;
      default: start = subDays(end, 30);
    }
    return { start, end };
  }, [period]);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["revenue-report", barbershop?.id, period],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          price,
          status,
          service_id,
          professional_id,
          services(name),
          professionals(name)
        `)
        .eq("barbershop_id", barbershop.id)
        .gte("booking_date", format(dateRange.start, "yyyy-MM-dd"))
        .lte("booking_date", format(dateRange.end, "yyyy-MM-dd"))
        .in("status", ["completed", "confirmed"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  const { data: previousBookings } = useQuery({
    queryKey: ["revenue-report-previous", barbershop?.id, period],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
      const prevEnd = subDays(dateRange.start, 1);
      const prevStart = subDays(prevEnd, days);
      const { data, error } = await supabase
        .from("bookings")
        .select("price")
        .eq("barbershop_id", barbershop.id)
        .gte("booking_date", format(prevStart, "yyyy-MM-dd"))
        .lte("booking_date", format(prevEnd, "yyyy-MM-dd"))
        .in("status", ["completed", "confirmed"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  const stats = useMemo(() => {
    if (!bookings) return { total: 0, average: 0, count: 0, growth: 0 };
    const total = bookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
    const count = bookings.length;
    const average = count > 0 ? total / count : 0;
    const previousTotal = previousBookings?.reduce((sum, b) => sum + (Number(b.price) || 0), 0) || 0;
    const growth = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0;
    return { total, average, count, growth };
  }, [bookings, previousBookings]);

  const chartData = useMemo(() => {
    if (!bookings) return [];
    
    if (period === "12m") {
      const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
      return months.map(month => {
        const monthBookings = bookings.filter(b => isSameMonth(parseISO(b.booking_date), month));
        const revenue = monthBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
        return { name: format(month, "MMM", { locale: ptBR }), receita: revenue };
      });
    } else if (period === "90d") {
      const weeks = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end });
      return weeks.map(week => {
        const weekBookings = bookings.filter(b => isSameWeek(parseISO(b.booking_date), week));
        const revenue = weekBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
        return { name: format(week, "dd/MM", { locale: ptBR }), receita: revenue };
      });
    } else {
      const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
      return days.map(day => {
        const dayBookings = bookings.filter(b => isSameDay(parseISO(b.booking_date), day));
        const revenue = dayBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
        return { name: format(day, "dd/MM", { locale: ptBR }), receita: revenue };
      });
    }
  }, [bookings, period, dateRange]);

  const serviceData = useMemo(() => {
    if (!bookings) return [];
    const serviceMap = new Map<string, number>();
    bookings.forEach(b => {
      const serviceName = (b.services as any)?.name || "Outros";
      serviceMap.set(serviceName, (serviceMap.get(serviceName) || 0) + (Number(b.price) || 0));
    });
    return Array.from(serviceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [bookings]);

  const professionalData = useMemo(() => {
    if (!bookings) return [];
    const profMap = new Map<string, number>();
    bookings.forEach(b => {
      const profName = (b.professionals as any)?.name || "Não atribuído";
      profMap.set(profName, (profMap.get(profName) || 0) + (Number(b.price) || 0));
    });
    return Array.from(profMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bookings]);

  const handleExport = () => {
    if (!bookings) return;
    const csv = [
      ["Data", "Serviço", "Profissional", "Valor", "Status"],
      ...bookings.map(b => [
        b.booking_date,
        (b.services as any)?.name || "",
        (b.professionals as any)?.name || "",
        b.price?.toString() || "0",
        b.status || ""
      ])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receita-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (!barbershop?.id) {
    return <AdminPageScaffold title="Relatório de Receita" subtitle="Análise detalhada de faturamento" icon={BarChart3} />;
  }

  return (
    <AdminPageScaffold
      title="Relatório de Receita"
      subtitle="Análise detalhada de faturamento por período"
      icon={BarChart3}
      actions={
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-36">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="12m">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Receita Total</p>
                    <p className="text-2xl font-bold">R$ {stats.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                    <p className="text-2xl font-bold">R$ {stats.average.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Atendimentos</p>
                    <p className="text-2xl font-bold">{stats.count}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-500/10">
                    <Calendar className="w-5 h-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Crescimento</p>
                    <p className={`text-2xl font-bold ${stats.growth >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {stats.growth >= 0 ? "+" : ""}{stats.growth.toFixed(1)}%
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${stats.growth >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                    {stats.growth >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução da Receita</CardTitle>
              <CardDescription>Faturamento ao longo do período selecionado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]}
                    />
                    <Area type="monotone" dataKey="receita" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorReceita)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Service and Professional Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Receita por Serviço</CardTitle>
                <CardDescription>Top 5 serviços mais rentáveis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {serviceData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receita por Profissional</CardTitle>
                <CardDescription>Faturamento por membro da equipe</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={professionalData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$${v}`} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AdminPageScaffold>
  );
}

export default RevenueReportPage;
