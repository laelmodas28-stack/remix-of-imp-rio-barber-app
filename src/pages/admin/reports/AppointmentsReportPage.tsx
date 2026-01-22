import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PieChart as PieChartIcon, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Download, Loader2 } from "lucide-react";
import { format, subDays, parseISO, getDay, getHours, eachDayOfInterval, isSameDay, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

type Period = "7d" | "30d" | "90d" | "12m";

const COLORS = {
  completed: "hsl(var(--chart-2))",
  confirmed: "hsl(var(--primary))",
  pending: "hsl(var(--chart-4))",
  cancelled: "hsl(var(--destructive))",
  no_show: "hsl(var(--chart-5))",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Concluído",
  confirmed: "Confirmado",
  pending: "Pendente",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function AppointmentsReportPage() {
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
    queryKey: ["appointments-report", barbershop?.id, period],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          booking_time,
          status,
          service_id,
          professional_id,
          services(name, duration_minutes),
          professionals(name)
        `)
        .eq("barbershop_id", barbershop.id)
        .gte("booking_date", format(dateRange.start, "yyyy-MM-dd"))
        .lte("booking_date", format(dateRange.end, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  const stats = useMemo(() => {
    if (!bookings) return { total: 0, completed: 0, cancelled: 0, noShow: 0, completionRate: 0 };
    const total = bookings.length;
    const completed = bookings.filter(b => b.status === "completed").length;
    const cancelled = bookings.filter(b => b.status === "cancelled").length;
    const noShow = bookings.filter(b => b.status === "no_show").length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, cancelled, noShow, completionRate };
  }, [bookings]);

  const statusData = useMemo(() => {
    if (!bookings) return [];
    const statusMap = new Map<string, number>();
    bookings.forEach(b => {
      const status = b.status || "pending";
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    return Array.from(statusMap.entries()).map(([name, value]) => ({
      name: STATUS_LABELS[name] || name,
      value,
      color: COLORS[name as keyof typeof COLORS] || "hsl(var(--muted))",
    }));
  }, [bookings]);

  const weekdayData = useMemo(() => {
    if (!bookings) return [];
    const weekdayMap = [0, 0, 0, 0, 0, 0, 0];
    bookings.forEach(b => {
      const dayIndex = getDay(parseISO(b.booking_date));
      weekdayMap[dayIndex]++;
    });
    return WEEKDAYS.map((name, index) => ({ name, agendamentos: weekdayMap[index] }));
  }, [bookings]);

  const hourlyData = useMemo(() => {
    if (!bookings) return [];
    const hourMap: Record<number, number> = {};
    for (let i = 8; i <= 20; i++) hourMap[i] = 0;
    
    bookings.forEach(b => {
      if (b.booking_time) {
        const hour = parseInt(b.booking_time.split(":")[0]);
        if (hourMap[hour] !== undefined) hourMap[hour]++;
      }
    });
    
    return Object.entries(hourMap).map(([hour, count]) => ({
      name: `${hour}h`,
      agendamentos: count,
    }));
  }, [bookings]);

  const dailyData = useMemo(() => {
    if (!bookings) return [];
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    return days.slice(-14).map(day => {
      const dayBookings = bookings.filter(b => isSameDay(parseISO(b.booking_date), day));
      return {
        name: format(day, "dd/MM", { locale: ptBR }),
        total: dayBookings.length,
        concluidos: dayBookings.filter(b => b.status === "completed").length,
      };
    });
  }, [bookings, dateRange]);

  const serviceStats = useMemo(() => {
    if (!bookings) return [];
    const serviceMap = new Map<string, { count: number; duration: number }>();
    bookings.forEach(b => {
      const serviceName = (b.services as any)?.name || "Outros";
      const duration = (b.services as any)?.duration_minutes || 30;
      const current = serviceMap.get(serviceName) || { count: 0, duration: 0 };
      serviceMap.set(serviceName, { count: current.count + 1, duration: current.duration + duration });
    });
    return Array.from(serviceMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [bookings]);

  const handleExport = () => {
    if (!bookings) return;
    const csv = [
      ["Data", "Horário", "Serviço", "Profissional", "Status"],
      ...bookings.map(b => [
        b.booking_date,
        b.booking_time,
        (b.services as any)?.name || "",
        (b.professionals as any)?.name || "",
        STATUS_LABELS[b.status || ""] || b.status || ""
      ])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agendamentos-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (!barbershop?.id) {
    return <AdminPageScaffold title="Relatório de Agendamentos" subtitle="Estatísticas de agendamentos" icon={PieChartIcon} />;
  }

  return (
    <AdminPageScaffold
      title="Relatório de Agendamentos"
      subtitle="Estatísticas e análises de agendamentos"
      icon={PieChartIcon}
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                    <p className="text-sm text-muted-foreground">Concluídos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.cancelled}</p>
                    <p className="text-sm text-muted-foreground">Cancelados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.noShow}</p>
                    <p className="text-sm text-muted-foreground">No-show</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.completionRate.toFixed(0)}%</p>
                    <p className="text-sm text-muted-foreground">Taxa Conclusão</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Status dos Agendamentos</CardTitle>
                <CardDescription>Distribuição por status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agendamentos por Dia da Semana</CardTitle>
                <CardDescription>Dias mais movimentados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekdayData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="agendamentos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Horários Mais Populares</CardTitle>
                <CardDescription>Distribuição por hora do dia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="agendamentos" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tendência Diária</CardTitle>
                <CardDescription>Últimos 14 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="concluidos" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Top Serviços</CardTitle>
              <CardDescription>Serviços mais agendados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serviceStats.map((service, index) => (
                  <div key={service.name} className="flex items-center gap-4">
                    <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{service.name}</span>
                        <span className="text-sm text-muted-foreground">{service.count} agendamentos</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(service.count / (serviceStats[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminPageScaffold>
  );
}

export default AppointmentsReportPage;
