import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, Award, Users } from "lucide-react";

interface Booking {
  id: string;
  price?: number | null;
  total_price?: number | null;
  booking_date: string;
  status: string | null;
  professional?: { name: string } | null;
  professional_id: string | null;
  service?: { name: string } | null;
}

interface Professional {
  id: string;
  name: string;
  photo_url?: string | null;
  specialties?: string[] | null;
}

interface ProfessionalPerformanceProps {
  bookings: Booking[];
  professionals: Professional[];
}

const ProfessionalPerformance = ({
  bookings,
  professionals,
}: ProfessionalPerformanceProps) => {
  const completedBookings = bookings.filter((b) => b.status === "completed");

  // Calcular métricas por profissional
  const professionalMetrics = professionals.map((prof) => {
    const profBookings = completedBookings.filter(
      (b) => b.professional_id === prof.id
    );
    const totalRevenue = profBookings.reduce(
      (sum, b) => sum + Number(b.total_price || b.price || 0),
      0
    );
    const totalBookings = profBookings.length;
    const averageTicket = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    return {
      ...prof,
      totalRevenue,
      totalBookings,
      averageTicket,
    };
  });

  // Ordenar por faturamento
  const sortedByRevenue = [...professionalMetrics].sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  );

  // Encontrar o top performer
  const topPerformer = sortedByRevenue[0];

  // Calcular total geral para percentuais
  const totalGeneralRevenue = professionalMetrics.reduce(
    (sum, p) => sum + p.totalRevenue,
    0
  );

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Performance da Equipe
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedByRevenue.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum profissional encontrado
          </p>
        ) : (
          <div className="space-y-4">
            {sortedByRevenue.map((prof, index) => {
              const isTop = index === 0 && prof.totalRevenue > 0;
              const percentOfTotal =
                totalGeneralRevenue > 0
                  ? ((prof.totalRevenue / totalGeneralRevenue) * 100).toFixed(1)
                  : "0";

              return (
                <div
                  key={prof.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                    isTop
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-card/30"
                  }`}
                >
                  {/* Ranking */}
                  <div className="flex-shrink-0 w-8 text-center">
                    {isTop ? (
                      <Award className="h-6 w-6 text-primary mx-auto" />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={prof.photo_url || ""} alt={prof.name} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {prof.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{prof.name}</h4>
                      {isTop && (
                        <Badge
                          variant="default"
                          className="bg-primary text-primary-foreground"
                        >
                          Top
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {prof.totalBookings} atendimentos
                    </p>
                  </div>

                  {/* Métricas */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-lg text-primary">
                      R$ {prof.totalRevenue.toFixed(2)}
                    </p>
                    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                      <span>{percentOfTotal}% do total</span>
                      {prof.totalRevenue > 0 && (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Resumo */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {professionalMetrics.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Profissionais</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {completedBookings.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Atendimentos Total
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    R$ {totalGeneralRevenue.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Faturamento Total
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfessionalPerformance;
