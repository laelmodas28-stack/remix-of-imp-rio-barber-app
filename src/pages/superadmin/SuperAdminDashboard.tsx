import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, TrendingUp, Calendar, AlertTriangle } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SuperAdminDashboard() {
  // Total barbershops
  const { data: barbershopsCount } = useQuery({
    queryKey: ["superadmin-barbershops-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("barbershops")
        .select("*", { count: "exact", head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Active barbershops (with subscription)
  const { data: activeSubscriptions } = useQuery({
    queryKey: ["superadmin-active-subscriptions"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("barbershop_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Trial barbershops
  const { data: trialCount } = useQuery({
    queryKey: ["superadmin-trial-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("barbershop_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("plan_type", "trial")
        .eq("status", "active");
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Recent registrations (last 7 days)
  const { data: recentRegistrations } = useQuery({
    queryKey: ["superadmin-recent-registrations"],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { count, error } = await supabase
        .from("barbershops")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo);
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Expiring trials (next 3 days)
  const { data: expiringTrials } = useQuery({
    queryKey: ["superadmin-expiring-trials"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("barbershop_subscriptions")
        .select(`
          *,
          barbershop:barbershops(name, slug)
        `)
        .eq("plan_type", "trial")
        .eq("status", "active")
        .gte("trial_ends_at", now)
        .lte("trial_ends_at", threeDaysFromNow);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Recent activity logs
  const { data: recentLogs } = useQuery({
    queryKey: ["superadmin-recent-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
  });

  const stats = [
    {
      title: "Total de Barbearias",
      value: barbershopsCount ?? 0,
      icon: Building2,
      description: "Cadastradas na plataforma",
    },
    {
      title: "Assinaturas Ativas",
      value: activeSubscriptions ?? 0,
      icon: CreditCard,
      description: "Planos pagos ativos",
    },
    {
      title: "Em Trial",
      value: trialCount ?? 0,
      icon: Calendar,
      description: "Período de teste",
    },
    {
      title: "Novos (7 dias)",
      value: recentRegistrations ?? 0,
      icon: TrendingUp,
      description: "Registros recentes",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral da plataforma ImperioApp
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Trials Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Trials Expirando
            </CardTitle>
            <CardDescription>
              Barbearias com trial expirando nos próximos 3 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expiringTrials && expiringTrials.length > 0 ? (
              <div className="space-y-3">
                {expiringTrials.map((trial: any) => (
                  <div
                    key={trial.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{trial.barbershop?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        /{trial.barbershop?.slug}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-yellow-600 font-medium">
                        Expira em{" "}
                        {format(new Date(trial.trial_ends_at), "dd/MM", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nenhum trial expirando nos próximos 3 dias
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Últimas ações na plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs && recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.entity_type}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma atividade registrada
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
