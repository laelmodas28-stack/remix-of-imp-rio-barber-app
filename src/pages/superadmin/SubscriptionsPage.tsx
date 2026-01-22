import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, CreditCard, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SubscriptionsPage() {
  // Fetch all subscriptions with barbershop info
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["superadmin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbershop_subscriptions")
        .select(`
          *,
          barbershop:barbershops(name, slug)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Stats
  const stats = {
    total: subscriptions?.length || 0,
    active: subscriptions?.filter((s) => s.status === "active").length || 0,
    trial: subscriptions?.filter((s) => s.plan_type === "trial" && s.status === "active").length || 0,
    paid: subscriptions?.filter((s) => s.plan_type !== "trial" && s.status === "active").length || 0,
  };

  const getStatusBadge = (sub: any) => {
    if (sub.status === "suspended") {
      return <Badge variant="destructive">Suspenso</Badge>;
    }
    if (sub.status === "cancelled") {
      return <Badge variant="secondary">Cancelado</Badge>;
    }

    if (sub.plan_type === "trial") {
      const daysLeft = differenceInDays(new Date(sub.trial_ends_at), new Date());
      if (daysLeft <= 0) {
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Expirado
          </Badge>
        );
      }
      if (daysLeft <= 3) {
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-500/20 text-yellow-600">
            <Clock className="w-3 h-3" />
            {daysLeft}d restantes
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Trial ({daysLeft}d)
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="bg-green-600 flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        Ativo
      </Badge>
    );
  };

  const getPlanBadge = (planType: string) => {
    const colors: Record<string, string> = {
      trial: "bg-blue-500/20 text-blue-600 border-blue-500/30",
      basic: "bg-gray-500/20 text-gray-600 border-gray-500/30",
      professional: "bg-purple-500/20 text-purple-600 border-purple-500/30",
      enterprise: "bg-primary/20 text-primary border-primary/30",
    };

    return (
      <Badge variant="outline" className={colors[planType] || ""}>
        {planType.charAt(0).toUpperCase() + planType.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Assinaturas</h1>
        <p className="text-muted-foreground">
          Visão detalhada de todas as assinaturas da plataforma
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Trial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.trial}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Planos Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.paid}</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Todas as Assinaturas
          </CardTitle>
          <CardDescription>
            Lista completa de assinaturas ordenadas por data de criação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barbearia</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial/Assinatura</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions?.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{sub.barbershop?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          /{sub.barbershop?.slug}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(sub.plan_type)}</TableCell>
                    <TableCell>{getStatusBadge(sub)}</TableCell>
                    <TableCell>
                      {sub.plan_type === "trial" && sub.trial_ends_at ? (
                        <span className="text-sm">
                          Até {format(new Date(sub.trial_ends_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      ) : sub.subscription_ends_at ? (
                        <span className="text-sm">
                          Até {format(new Date(sub.subscription_ends_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(sub.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SubscriptionsPage;
