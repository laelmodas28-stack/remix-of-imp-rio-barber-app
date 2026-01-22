import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Scissors, TrendingUp, DollarSign } from "lucide-react";

interface Booking {
  id: string;
  price?: number | null;
  total_price?: number | null;
  booking_date: string;
  status: string | null;
  service?: { name: string } | null;
  service_id: string | null;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

interface ServiceAnalysisProps {
  bookings: Booking[];
  services: Service[];
}

const ServiceAnalysis = ({ bookings, services }: ServiceAnalysisProps) => {
  const completedBookings = bookings.filter((b) => b.status === "completed");

  // Calcular métricas por serviço
  const serviceMetrics = services.map((service) => {
    const serviceBookings = completedBookings.filter(
      (b) => b.service_id === service.id
    );
    const totalRevenue = serviceBookings.reduce(
      (sum, b) => sum + Number(b.total_price || b.price || 0),
      0
    );
    const totalSold = serviceBookings.length;
    const averagePrice =
      totalSold > 0 ? totalRevenue / totalSold : service.price;

    return {
      ...service,
      totalRevenue,
      totalSold,
      averagePrice,
    };
  });

  // Ordenar por receita
  const sortedByRevenue = [...serviceMetrics].sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  );

  // Ordenar por quantidade vendida
  const sortedBySold = [...serviceMetrics].sort(
    (a, b) => b.totalSold - a.totalSold
  );

  // Calcular total geral
  const totalGeneralRevenue = serviceMetrics.reduce(
    (sum, s) => sum + s.totalRevenue,
    0
  );
  const totalGeneralSold = serviceMetrics.reduce(
    (sum, s) => sum + s.totalSold,
    0
  );

  // Máximo para normalizar barras
  const maxRevenue = Math.max(...serviceMetrics.map((s) => s.totalRevenue), 1);
  const maxSold = Math.max(...serviceMetrics.map((s) => s.totalSold), 1);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Por Receita */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Serviços por Receita
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedByRevenue.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum serviço encontrado
            </p>
          ) : (
            <div className="space-y-4">
              {sortedByRevenue.slice(0, 8).map((service, index) => {
                const isTop = index === 0 && service.totalRevenue > 0;
                const percentOfMax = (service.totalRevenue / maxRevenue) * 100;
                const percentOfTotal =
                  totalGeneralRevenue > 0
                    ? ((service.totalRevenue / totalGeneralRevenue) * 100).toFixed(1)
                    : "0";

                return (
                  <div key={service.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate max-w-[150px]">
                          {service.name}
                        </span>
                        {isTop && (
                          <Badge
                            variant="default"
                            className="bg-primary text-primary-foreground text-xs"
                          >
                            Top
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-primary">
                          R$ {service.totalRevenue.toFixed(0)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({percentOfTotal}%)
                        </span>
                      </div>
                    </div>
                    <Progress value={percentOfMax} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {service.totalSold} vendas • Média: R${" "}
                      {service.averagePrice.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Por Quantidade */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            Serviços por Quantidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedBySold.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum serviço encontrado
            </p>
          ) : (
            <div className="space-y-4">
              {sortedBySold.slice(0, 8).map((service, index) => {
                const isTop = index === 0 && service.totalSold > 0;
                const percentOfMax = (service.totalSold / maxSold) * 100;
                const percentOfTotal =
                  totalGeneralSold > 0
                    ? ((service.totalSold / totalGeneralSold) * 100).toFixed(1)
                    : "0";

                return (
                  <div key={service.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate max-w-[150px]">
                          {service.name}
                        </span>
                        {isTop && (
                          <Badge
                            variant="default"
                            className="bg-primary text-primary-foreground text-xs"
                          >
                            Popular
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{service.totalSold}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          vendas
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({percentOfTotal}%)
                        </span>
                      </div>
                    </div>
                    <Progress value={percentOfMax} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Receita: R$ {service.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo Geral */}
      <Card className="border-border lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Resumo de Serviços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-card/50 rounded-lg border border-border">
              <p className="text-2xl font-bold text-primary">
                {services.length}
              </p>
              <p className="text-xs text-muted-foreground">Serviços Ativos</p>
            </div>
            <div className="p-4 bg-card/50 rounded-lg border border-border">
              <p className="text-2xl font-bold">{totalGeneralSold}</p>
              <p className="text-xs text-muted-foreground">Total Vendidos</p>
            </div>
            <div className="p-4 bg-card/50 rounded-lg border border-border">
              <p className="text-2xl font-bold text-primary">
                R$ {totalGeneralRevenue.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">Receita Total</p>
            </div>
            <div className="p-4 bg-card/50 rounded-lg border border-border">
              <p className="text-2xl font-bold">
                R${" "}
                {totalGeneralSold > 0
                  ? (totalGeneralRevenue / totalGeneralSold).toFixed(2)
                  : "0.00"}
              </p>
              <p className="text-xs text-muted-foreground">Ticket Médio</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceAnalysis;
