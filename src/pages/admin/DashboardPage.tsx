import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import {
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Plus,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function DashboardPage() {
  const { barbershop, baseUrl } = useBarbershopContext();

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["admin-dashboard-bookings", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          service:services(name, price),
          professional:professionals(name)
        `)
        .eq("barbershop_id", barbershop.id)
        .gte("booking_date", startOfMonth(new Date()).toISOString())
        .lte("booking_date", endOfMonth(new Date()).toISOString())
        .order("booking_date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  const { data: previousBookings = [] } = useQuery({
    queryKey: ["admin-dashboard-prev-bookings", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const prevMonth = subMonths(new Date(), 1);
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, price")
        .eq("barbershop_id", barbershop.id)
        .gte("booking_date", startOfMonth(prevMonth).toISOString())
        .lte("booking_date", endOfMonth(prevMonth).toISOString());
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["admin-dashboard-clients", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("barbershop_clients")
        .select("id")
        .eq("barbershop_id", barbershop.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  // Calculate metrics
  const completedBookings = (bookings || []).filter((b: any) => b.status === "confirmed" || b.status === "completed");
  const totalRevenue = completedBookings.reduce((acc: number, b: any) => acc + (b.total_price || b.service?.price || 0), 0);
  const prevCompletedBookings = (previousBookings || []).filter((b: any) => b.status === "confirmed" || b.status === "completed");
  const prevRevenue = prevCompletedBookings.reduce((acc: number, b: any) => acc + (b.total_price || 0), 0);
  
  const revenueGrowth = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0;
  const bookingsGrowth = prevCompletedBookings.length > 0 
    ? Math.round(((completedBookings.length - prevCompletedBookings.length) / prevCompletedBookings.length) * 100) 
    : 0;

  const todayBookings = bookings.filter((b) => {
    const bookingDate = parseISO(b.booking_date);
    return isToday(bookingDate);
  });

  const recentBookings = bookings.slice(0, 5);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pendente" },
      confirmed: { variant: "default", label: "Confirmado" },
      completed: { variant: "outline", label: "Concluido" },
      cancelled: { variant: "destructive", label: "Cancelado" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (bookingsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" subtitle="Visao geral do seu negocio" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="card-elevated">
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Bem-vindo ao painel administrativo de ${barbershop?.name}`}
        actions={
          <Button asChild className="gap-2">
            <Link to={`${baseUrl}/admin/bookings/new`}>
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Link>
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Receita do Mes"
          value={`R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          trend={{ value: revenueGrowth, label: "vs mes anterior" }}
        />
        <StatsCard
          title="Agendamentos"
          value={completedBookings.length}
          description={`${todayBookings.length} hoje`}
          icon={Calendar}
          trend={{ value: bookingsGrowth, label: "vs mes anterior" }}
        />
        <StatsCard
          title="Total de Clientes"
          value={clients.length}
          icon={Users}
        />
        <StatsCard
          title="Ticket Medio"
          value={`R$ ${completedBookings.length > 0 ? (totalRevenue / completedBookings.length).toFixed(2) : "0.00"}`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Agenda de Hoje</CardTitle>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-muted-foreground">
              <Link to={`${baseUrl}/admin/bookings`}>
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {todayBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum agendamento para hoje</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayBookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Cliente</p>
                        <p className="text-xs text-muted-foreground">
                          {booking.booking_time} - {booking.service?.name}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Agendamentos Recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-muted-foreground">
              <Link to={`${baseUrl}/admin/bookings`}>
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum agendamento este mes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">Cliente</p>
                        {getStatusBadge(booking.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(booking.booking_date), "dd/MM", { locale: ptBR })} as {booking.booking_time} - {booking.service?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        R$ {(booking.total_price || booking.service?.price || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">{booking.professional?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="card-elevated">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedBookings.length}</p>
              <p className="text-sm text-muted-foreground">Agendamentos confirmados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{bookings.filter((b) => b.status === "pending").length}</p>
              <p className="text-sm text-muted-foreground">Agendamentos pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{bookings.filter((b) => b.status === "cancelled").length}</p>
              <p className="text-sm text-muted-foreground">Agendamentos cancelados</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DashboardPage;
