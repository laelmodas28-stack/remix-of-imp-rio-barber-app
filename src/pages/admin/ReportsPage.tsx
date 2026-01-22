import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  PieChart,
  UserCheck,
  Download,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  FileText,
  ArrowRight,
} from "lucide-react";

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  path: string;
}

const reports: ReportCard[] = [
  {
    id: "revenue",
    title: "Relatorio de Receita",
    description: "Analise detalhada de faturamento por periodo, servico e profissional",
    icon: DollarSign,
    category: "Financeiro",
    path: "revenue",
  },
  {
    id: "bookings",
    title: "Relatorio de Agendamentos",
    description: "Estatisticas de agendamentos, horarios de pico e taxa de ocupacao",
    icon: Calendar,
    category: "Operacional",
    path: "bookings",
  },
  {
    id: "professionals",
    title: "Desempenho de Profissionais",
    description: "Metricas individuais, comissoes e produtividade da equipe",
    icon: Users,
    category: "Equipe",
    path: "professionals",
  },
  {
    id: "services",
    title: "Analise de Servicos",
    description: "Servicos mais vendidos, ticket medio e tendencias",
    icon: PieChart,
    category: "Servicos",
    path: "services",
  },
  {
    id: "retention",
    title: "Retencao de Clientes",
    description: "Taxa de retorno, clientes novos vs recorrentes e churn",
    icon: UserCheck,
    category: "Clientes",
    path: "retention",
  },
  {
    id: "growth",
    title: "Crescimento",
    description: "Comparativo mensal, tendencias e projecoes",
    icon: TrendingUp,
    category: "Estrategico",
    path: "growth",
  },
];

const recentReports = [
  {
    id: "1",
    name: "Receita Mensal - Dezembro 2024",
    generatedAt: "2024-12-15T10:30:00",
    type: "revenue",
  },
  {
    id: "2",
    name: "Agendamentos - Semana 50",
    generatedAt: "2024-12-14T14:00:00",
    type: "bookings",
  },
];

export function ReportsPage() {
  const { baseUrl } = useBarbershopContext();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatorios"
        subtitle="Analise o desempenho do seu negocio com relatorios detalhados"
        actions={
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Central de Exportacao
          </Button>
        }
      />

      {/* Report Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card
            key={report.id}
            className="card-elevated cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => navigate(`${baseUrl}/admin/reports/${report.path}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <report.icon className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {report.category}
                </Badge>
              </div>
              <CardTitle className="text-base mt-3">{report.title}</CardTitle>
              <CardDescription className="text-sm">
                {report.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-primary">
                Gerar Relatorio
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reports */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-lg">Relatorios Recentes</CardTitle>
          <CardDescription>
            Relatorios gerados anteriormente disponiveis para download
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhum relatorio gerado ainda
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{report.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Gerado em {new Date(report.generatedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Baixar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ReportsPage;
