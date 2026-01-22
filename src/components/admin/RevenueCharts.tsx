import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, startOfYear } from "date-fns";
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

interface RevenueChartsProps {
  bookings: Booking[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
];

const RevenueCharts = ({ bookings }: RevenueChartsProps) => {
  const completedBookings = bookings.filter((b) => b.status === "completed");

  // Dados de faturamento diário (últimos 30 dias)
  const last30Days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date(),
  });

  const dailyRevenueData = last30Days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayBookings = completedBookings.filter(
      (b) => b.booking_date === dayStr
    );
    const revenue = dayBookings.reduce(
      (sum, b) => sum + Number(b.total_price || b.price || 0),
      0
    );
    return {
      date: format(day, "dd/MM", { locale: ptBR }),
      fullDate: format(day, "dd 'de' MMMM", { locale: ptBR }),
      faturamento: revenue,
      atendimentos: dayBookings.length,
    };
  });

  // Dados de faturamento mensal (últimos 6 meses)
  const monthlyRevenueData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const monthBookings = completedBookings.filter((b) => {
      const bookingDate = new Date(b.booking_date);
      return bookingDate >= monthStart && bookingDate <= monthEnd;
    });

    const revenue = monthBookings.reduce(
      (sum, b) => sum + Number(b.total_price || b.price || 0),
      0
    );

    return {
      mes: format(month, "MMM/yy", { locale: ptBR }),
      fullMonth: format(month, "MMMM 'de' yyyy", { locale: ptBR }),
      faturamento: revenue,
      atendimentos: monthBookings.length,
    };
  });

  // Dados de receita por serviço
  const serviceRevenueData = completedBookings.reduce((acc, booking) => {
    const serviceName = booking.service?.name || "Outro";
    const existing = acc.find((item) => item.name === serviceName);
    const bookingValue = Number(booking.total_price || booking.price || 0);
    if (existing) {
      existing.value += bookingValue;
      existing.count += 1;
    } else {
      acc.push({
        name: serviceName,
        value: bookingValue,
        count: 1,
      });
    }
    return acc;
  }, [] as { name: string; value: number; count: number }[]);

  // Ordenar por valor e pegar os top 8
  const topServices = serviceRevenueData
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{payload[0]?.payload?.fullDate || payload[0]?.payload?.fullMonth || label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name === "faturamento" ? "Faturamento" : "Atendimentos"}:{" "}
              {entry.name === "faturamento"
                ? `R$ ${entry.value.toFixed(2)}`
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{payload[0]?.name}</p>
          <p className="text-sm text-primary">
            R$ {payload[0]?.value?.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">
            {payload[0]?.payload?.count} atendimentos
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Gráficos de Faturamento</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Diário</TabsTrigger>
            <TabsTrigger value="monthly">Mensal</TabsTrigger>
            <TabsTrigger value="services">Por Serviço</TabsTrigger>
          </TabsList>

          {/* Gráfico Diário */}
          <TabsContent value="daily" className="mt-4">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="faturamento"
                    name="Faturamento"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Faturamento dos últimos 30 dias
            </p>
          </TabsContent>

          {/* Gráfico Mensal */}
          <TabsContent value="monthly" className="mt-4">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="faturamento"
                    name="Faturamento"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Evolução do faturamento nos últimos 6 meses
            </p>
          </TabsContent>

          {/* Gráfico por Serviço */}
          <TabsContent value="services" className="mt-4">
            <div className="h-[350px]">
              {topServices.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topServices}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {topServices.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum dado de serviço disponível
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Distribuição de receita por serviço
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RevenueCharts;
