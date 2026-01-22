import { useNavigate } from "react-router-dom";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Users,
  Scissors,
  UserCircle,
  FileWarning,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

interface ImportOption {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  fields: string[];
}

const importOptions: ImportOption[] = [
  {
    id: "clients",
    title: "Importar Clientes",
    description: "Importe sua base de clientes a partir de um arquivo CSV",
    icon: Users,
    path: "clients",
    fields: ["Nome", "Email", "Telefone", "Data de Nascimento"],
  },
  {
    id: "services",
    title: "Importar Servicos",
    description: "Adicione servicos em massa com precos e duracoes",
    icon: Scissors,
    path: "services",
    fields: ["Nome", "Descricao", "Preco", "Duracao"],
  },
  {
    id: "professionals",
    title: "Importar Profissionais",
    description: "Cadastre sua equipe rapidamente via planilha",
    icon: UserCircle,
    path: "professionals",
    fields: ["Nome", "Email", "Telefone", "Especialidade"],
  },
];

const recentImports = [
  {
    id: "1",
    type: "clients",
    filename: "clientes_dezembro.csv",
    status: "completed",
    records: 150,
    errors: 3,
    createdAt: "2024-12-15T10:30:00",
  },
  {
    id: "2",
    type: "services",
    filename: "servicos.csv",
    status: "completed",
    records: 25,
    errors: 0,
    createdAt: "2024-12-10T14:00:00",
  },
  {
    id: "3",
    type: "clients",
    filename: "clientes_novos.csv",
    status: "failed",
    records: 0,
    errors: 50,
    createdAt: "2024-12-08T09:15:00",
  },
];

export function ImportsPage() {
  const { baseUrl } = useBarbershopContext();
  const navigate = useNavigate();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "processing":
        return <Clock className="h-4 w-4 text-warning" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Concluido";
      case "processing":
        return "Processando";
      case "failed":
        return "Falhou";
      default:
        return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "clients":
        return Users;
      case "services":
        return Scissors;
      case "professionals":
        return UserCircle;
      default:
        return Upload;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importacoes"
        subtitle="Importe dados em massa para sua barbearia"
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(`${baseUrl}/admin/import-logs`)}
          >
            <FileWarning className="h-4 w-4" />
            Ver Logs
          </Button>
        }
      />

      {/* Import Options Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {importOptions.map((option) => (
          <Card
            key={option.id}
            className="card-elevated cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => navigate(`${baseUrl}/admin/imports/${option.path}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-3">
                <option.icon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-base">{option.title}</CardTitle>
              <CardDescription className="text-sm">
                {option.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Campos suportados:
                </p>
                <div className="flex flex-wrap gap-1">
                  {option.fields.map((field) => (
                    <Badge key={field} variant="secondary" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-primary">
                Iniciar Importacao
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Imports */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-lg">Importacoes Recentes</CardTitle>
          <CardDescription>
            Historico das ultimas importacoes realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentImports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma importacao realizada ainda
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentImports.map((importItem) => {
                const TypeIcon = getTypeIcon(importItem.type);
                return (
                  <div
                    key={importItem.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <TypeIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{importItem.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(importItem.createdAt).toLocaleDateString("pt-BR")} -{" "}
                          {importItem.records} registros
                          {importItem.errors > 0 && (
                            <span className="text-destructive"> ({importItem.errors} erros)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(importItem.status)}
                      <span className="text-sm text-muted-foreground">
                        {getStatusLabel(importItem.status)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ImportsPage;
