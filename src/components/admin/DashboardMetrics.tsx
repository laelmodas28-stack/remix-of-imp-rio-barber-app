import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Calendar, Users, TrendingUp, Award, Star } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Booking {
  id: string;
  price?: number | null;
  total_price?: number | null;
  booking_date: string;
  status: string | null;
  professional?: { name: string } | null;
  service?: { name: string } | null;
}

interface DashboardMetricsProps {
  bookings: Booking[];
}

const DashboardMetrics = ({ bookings }: DashboardMetricsProps) => {
  // Filtrar agendamentos do mês atual
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const currentMonthBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.booking_date);
    return bookingDate >= monthStart && bookingDate <= monthEnd;
  });

  const completedBookings = currentMonthBookings.filter(
    (b) => b.status === "completed"
  );

  // Total faturado no mês
  const totalRevenue = completedBookings.reduce(
    (sum, booking) => sum + Number(booking.total_price || booking.price || 0),
    0
  );

  // Total de atendimentos
  const totalBookings = completedBookings.length;

  // Ticket médio
  const averageTicket = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  // Profissional que mais atendeu
  const professionalCounts = completedBookings.reduce((acc, booking) => {
    const name = booking.professional?.name || "Desconhecido";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topProfessional = Object.entries(professionalCounts).sort(
    ([, a], [, b]) => b - a
  )[0];

  // Serviço mais vendido
  const serviceCounts = completedBookings.reduce((acc, booking) => {
    const name = booking.service?.name || "Desconhecido";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topService = Object.entries(serviceCounts).sort(
    ([, a], [, b]) => b - a
  )[0];

  // Dia mais movimentado
  const dayCounts = completedBookings.reduce((acc, booking) => {
    const day = format(new Date(booking.booking_date), "EEEE", { locale: ptBR });
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const busiestDay = Object.entries(dayCounts).sort(
    ([, a], [, b]) => b - a
  )[0];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Total Faturado */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Faturado</CardTitle>
          <DollarSign className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            R$ {totalRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            {format(now, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </CardContent>
      </Card>

      {/* Total de Atendimentos */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Atendimentos</CardTitle>
          <Calendar className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalBookings}</div>
          <p className="text-xs text-muted-foreground">
            Agendamentos concluídos
          </p>
        </CardContent>
      </Card>

      {/* Ticket Médio */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">R$ {averageTicket.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Por atendimento
          </p>
        </CardContent>
      </Card>

      {/* Profissional Destaque */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Profissional Destaque</CardTitle>
          <Award className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold truncate">
            {topProfessional ? topProfessional[0] : "-"}
          </div>
          <p className="text-xs text-muted-foreground">
            {topProfessional ? `${topProfessional[1]} atendimentos` : "Nenhum dado"}
          </p>
        </CardContent>
      </Card>

      {/* Serviço Mais Vendido */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Serviço Mais Vendido</CardTitle>
          <Star className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold truncate">
            {topService ? topService[0] : "-"}
          </div>
          <p className="text-xs text-muted-foreground">
            {topService ? `${topService[1]} vezes` : "Nenhum dado"}
          </p>
        </CardContent>
      </Card>

      {/* Dia Mais Movimentado */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Dia Mais Movimentado</CardTitle>
          <Users className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">
            {busiestDay ? busiestDay[0] : "-"}
          </div>
          <p className="text-xs text-muted-foreground">
            {busiestDay ? `${busiestDay[1]} atendimentos` : "Nenhum dado"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardMetrics;
