import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, Search, Building2, CreditCard, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function LogsPage() {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Fetch all logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ["superadmin-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data;
    },
  });

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "barbershop":
        return <Building2 className="w-4 h-4" />;
      case "subscription":
        return <CreditCard className="w-4 h-4" />;
      case "user":
        return <User className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      barbershop_created: "bg-green-500/20 text-green-600",
      barbershop_activated: "bg-green-500/20 text-green-600",
      barbershop_deactivated: "bg-red-500/20 text-red-600",
      subscription_created: "bg-blue-500/20 text-blue-600",
      subscription_updated: "bg-yellow-500/20 text-yellow-600",
    };

    const labels: Record<string, string> = {
      barbershop_created: "Barbearia criada",
      barbershop_activated: "Barbearia ativada",
      barbershop_deactivated: "Barbearia desativada",
      subscription_created: "Assinatura criada",
      subscription_updated: "Assinatura atualizada",
    };

    return (
      <Badge variant="outline" className={colors[action] || ""}>
        {labels[action] || action}
      </Badge>
    );
  };

  const filteredLogs = logs?.filter((log) => {
    const matchesEntity = entityFilter === "all" || log.entity_type === entityFilter;
    const matchesSearch =
      search === "" ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(search.toLowerCase());

    return matchesEntity && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Logs de Atividade</h1>
        <p className="text-muted-foreground">
          Histórico de todas as ações realizadas na plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Logs do Sistema
              </CardTitle>
              <CardDescription>
                {filteredLogs?.length || 0} registros encontrados
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="barbershop">Barbearias</SelectItem>
                  <SelectItem value="subscription">Assinaturas</SelectItem>
                  <SelectItem value="user">Usuários</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getEntityIcon(log.entity_type)}
                        <span className="capitalize">{log.entity_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.details ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {JSON.stringify(log.details).slice(0, 50)}
                          {JSON.stringify(log.details).length > 50 && "..."}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum log encontrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LogsPage;
