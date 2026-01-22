import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCheck, Users, UserPlus, UserMinus, TrendingUp, Calendar, Download, Loader2, Star } from "lucide-react";
import { format, subDays, differenceInDays, parseISO, subMonths, eachMonthOfInterval, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ClientRetention {
  id: string;
  name: string;
  firstVisit: Date;
  lastVisit: Date;
  totalVisits: number;
  totalSpent: number;
  avgDaysBetween: number;
  status: "active" | "at_risk" | "churned";
}

const COLORS = {
  active: "hsl(var(--chart-2))",
  at_risk: "hsl(var(--chart-4))",
  churned: "hsl(var(--destructive))",
};

export function RetentionReportPage() {
  const { barbershop } = useBarbershopContext();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["retention-report", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          client_id,
          booking_date,
          price,
          status,
          profiles:client_id(name, email)
        `)
        .eq("barbershop_id", barbershop.id)
        .in("status", ["completed", "confirmed"])
        .order("booking_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  const clientRetention = useMemo((): ClientRetention[] => {
    if (!bookings) return [];
    
    const clientMap = new Map<string, { 
      name: string;
      visits: Date[];
      totalSpent: number;
    }>();

    bookings.forEach(b => {
      if (!b.client_id) return;
      const current = clientMap.get(b.client_id) || { 
        name: (b.profiles as any)?.name || "Cliente",
        visits: [],
        totalSpent: 0,
      };
      current.visits.push(parseISO(b.booking_date));
      current.totalSpent += Number(b.price) || 0;
      clientMap.set(b.client_id, current);
    });

    const today = new Date();
    
    return Array.from(clientMap.entries()).map(([id, data]) => {
      const sortedVisits = data.visits.sort((a, b) => a.getTime() - b.getTime());
      const firstVisit = sortedVisits[0];
      const lastVisit = sortedVisits[sortedVisits.length - 1];
      const daysSinceLastVisit = differenceInDays(today, lastVisit);
      
      // Calculate average days between visits
      let totalDays = 0;
      for (let i = 1; i < sortedVisits.length; i++) {
        totalDays += differenceInDays(sortedVisits[i], sortedVisits[i - 1]);
      }
      const avgDaysBetween = sortedVisits.length > 1 ? totalDays / (sortedVisits.length - 1) : 0;

      // Determine status
      let status: "active" | "at_risk" | "churned";
      if (daysSinceLastVisit <= 30) {
        status = "active";
      } else if (daysSinceLastVisit <= 60) {
        status = "at_risk";
      } else {
        status = "churned";
      }

      return {
        id,
        name: data.name,
        firstVisit,
        lastVisit,
        totalVisits: sortedVisits.length,
        totalSpent: data.totalSpent,
        avgDaysBetween,
        status,
      };
    }).sort((a, b) => b.totalVisits - a.totalVisits);
  }, [bookings]);

  const stats = useMemo(() => {
    const total = clientRetention.length;
    const active = clientRetention.filter(c => c.status === "active").length;
    const atRisk = clientRetention.filter(c => c.status === "at_risk").length;
    const churned = clientRetention.filter(c => c.status === "churned").length;
    const returning = clientRetention.filter(c => c.totalVisits > 1).length;
    const retentionRate = total > 0 ? (returning / total) * 100 : 0;
    const avgVisits = total > 0 ? clientRetention.reduce((sum, c) => sum + c.totalVisits, 0) / total : 0;
    
    return { total, active, atRisk, churned, returning, retentionRate, avgVisits };
  }, [clientRetention]);

  const monthlyData = useMemo(() => {
    if (!bookings) return [];
    const end = new Date();
    const start = subMonths(end, 6);
    const months = eachMonthOfInterval({ start, end });
    
    return months.map(month => {
      const monthBookings = bookings.filter(b => isSameMonth(parseISO(b.booking_date), month));
      const uniqueClients = new Set(monthBookings.map(b => b.client_id)).size;
      const newClients = bookings.filter(b => {
        const clientBookings = bookings.filter(ob => ob.client_id === b.client_id);
        const firstBooking = clientBookings.sort((a, b) => 
          parseISO(a.booking_date).getTime() - parseISO(b.booking_date).getTime()
        )[0];
        return isSameMonth(parseISO(firstBooking.booking_date), month);
      });
      
      return {
        name: format(month, "MMM", { locale: ptBR }),
        clientes: uniqueClients,
        novos: new Set(newClients.map(b => b.client_id)).size,
      };
    });
  }, [bookings]);

  const cohortData = useMemo(() => {
    return [
      { name: "1 visita", value: clientRetention.filter(c => c.totalVisits === 1).length },
      { name: "2-3 visitas", value: clientRetention.filter(c => c.totalVisits >= 2 && c.totalVisits <= 3).length },
      { name: "4-5 visitas", value: clientRetention.filter(c => c.totalVisits >= 4 && c.totalVisits <= 5).length },
      { name: "6+ visitas", value: clientRetention.filter(c => c.totalVisits >= 6).length },
    ];
  }, [clientRetention]);

  const topClients = useMemo(() => {
    return clientRetention.slice(0, 10);
  }, [clientRetention]);

  const handleExport = () => {
    const csv = [
      ["Cliente", "Primeira Visita", "Última Visita", "Total Visitas", "Total Gasto", "Status"],
      ...clientRetention.map(c => [
        c.name,
        format(c.firstVisit, "dd/MM/yyyy"),
        format(c.lastVisit, "dd/MM/yyyy"),
        c.totalVisits.toString(),
        c.totalSpent.toFixed(2),
        c.status
      ])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `retencao-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const getStatusBadge = (status: ClientRetention["status"]) => {
    const config = {
      active: { label: "Ativo", class: "bg-green-500/20 text-green-500" },
      at_risk: { label: "Em Risco", class: "bg-yellow-500/20 text-yellow-500" },
      churned: { label: "Inativo", class: "bg-red-500/20 text-red-500" },
    };
    return <Badge className={config[status].class}>{config[status].label}</Badge>;
  };

  if (!barbershop?.id) {
    return <AdminPageScaffold title="Retenção de Clientes" subtitle="Taxa de retorno e fidelização" icon={UserCheck} />;
  }

  return (
    <AdminPageScaffold
      title="Retenção de Clientes"
      subtitle="Taxa de retorno e fidelização"
      icon={UserCheck}
      actions={
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">Total Clientes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <UserCheck className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.active}</p>
                    <p className="text-sm text-muted-foreground">Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <UserMinus className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.atRisk}</p>
                    <p className="text-sm text-muted-foreground">Em Risco</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.retentionRate.toFixed(0)}%</p>
                    <p className="text-sm text-muted-foreground">Taxa Retenção</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Evolução de Clientes</CardTitle>
                <CardDescription>Clientes ativos e novos por mês</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorClientes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Area type="monotone" dataKey="clientes" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorClientes)" name="Total" />
                      <Line type="monotone" dataKey="novos" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Novos" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Frequência</CardTitle>
                <CardDescription>Número de visitas por cliente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cohortData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Clientes">
                        {cohortData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 3 ? "hsl(var(--primary))" : `hsl(var(--chart-${index + 2}))`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Clients Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Clientes Mais Fiéis
              </CardTitle>
              <CardDescription>Top 10 clientes por número de visitas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Primeira Visita</TableHead>
                      <TableHead>Última Visita</TableHead>
                      <TableHead>Visitas</TableHead>
                      <TableHead>Total Gasto</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topClients.length > 0 ? topClients.map((client, index) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{format(client.firstVisit, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                        <TableCell>{format(client.lastVisit, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                        <TableCell>{client.totalVisits}</TableCell>
                        <TableCell>R$ {client.totalSpent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{getStatusBadge(client.status)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum cliente encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* At Risk Clients */}
          {stats.atRisk > 0 && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <UserMinus className="w-5 h-5" />
                  Clientes em Risco ({stats.atRisk})
                </CardTitle>
                <CardDescription>Clientes que não visitam há mais de 30 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {clientRetention
                    .filter(c => c.status === "at_risk")
                    .slice(0, 10)
                    .map(client => (
                      <Badge key={client.id} variant="outline" className="bg-yellow-500/10">
                        {client.name} - última visita {format(client.lastVisit, "dd/MM", { locale: ptBR })}
                      </Badge>
                    ))}
                  {stats.atRisk > 10 && (
                    <Badge variant="secondary">+{stats.atRisk - 10} outros</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AdminPageScaffold>
  );
}

export default RetentionReportPage;
