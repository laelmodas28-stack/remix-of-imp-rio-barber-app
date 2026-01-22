import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CashflowEntry {
  date: Date;
  type: "entrada" | "saida";
  description: string;
  amount: number;
  category: string;
}

export function CashflowPage() {
  const { barbershop } = useBarbershopContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Fetch completed bookings (revenue)
  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ["cashflow-bookings", barbershop?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          total_price,
          service:services(name)
        `)
        .eq("barbershop_id", barbershop.id)
        .eq("status", "completed")
        .gte("booking_date", format(monthStart, "yyyy-MM-dd"))
        .lte("booking_date", format(monthEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  // Fetch subscriptions (revenue)
  const { data: subscriptions, isLoading: loadingSubscriptions } = useQuery({
    queryKey: ["cashflow-subscriptions", barbershop?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("client_subscriptions")
        .select(`
          id,
          start_date,
          plan:subscription_plans(name, price)
        `)
        .eq("barbershop_id", barbershop.id)
        .gte("start_date", format(monthStart, "yyyy-MM-dd"))
        .lte("start_date", format(monthEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  // Fetch commission payments (expenses)
  const { data: commissionPayments, isLoading: loadingCommissions } = useQuery({
    queryKey: ["cashflow-commissions", barbershop?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("commission_payments")
        .select(`
          id,
          commission_amount,
          paid_at,
          status,
          professional:professionals!inner(barbershop_id, name)
        `)
        .eq("professional.barbershop_id", barbershop.id)
        .eq("status", "paid")
        .gte("paid_at", monthStart.toISOString())
        .lte("paid_at", monthEnd.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  const isLoading = loadingBookings || loadingSubscriptions || loadingCommissions;

  // Build cashflow entries
  const cashflowEntries = useMemo(() => {
    const entries: CashflowEntry[] = [];

    // Add booking revenue
    bookings?.forEach(booking => {
      entries.push({
        date: new Date(booking.booking_date),
        type: "entrada",
        description: booking.service?.name || "Atendimento",
        amount: Number(booking.total_price || 0),
        category: "Serviços",
      });
    });

    // Add subscription revenue
    subscriptions?.forEach(sub => {
      entries.push({
        date: new Date(sub.start_date),
        type: "entrada",
        description: `Assinatura: ${sub.plan?.name}`,
        amount: Number(sub.plan?.price || 0),
        category: "Assinaturas",
      });
    });

    // Add commission payments (expenses)
    commissionPayments?.forEach(payment => {
      if (payment.paid_at) {
        entries.push({
          date: new Date(payment.paid_at),
          type: "saida",
          description: `Comissão: ${payment.professional?.name}`,
          amount: Number(payment.commission_amount || 0),
          category: "Comissões",
        });
      }
    });

    return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [bookings, subscriptions, commissionPayments]);

  // Calculate totals
  const totalEntradas = cashflowEntries
    .filter(e => e.type === "entrada")
    .reduce((sum, e) => sum + e.amount, 0);
  
  const totalSaidas = cashflowEntries
    .filter(e => e.type === "saida")
    .reduce((sum, e) => sum + e.amount, 0);

  const saldoMes = totalEntradas - totalSaidas;

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fluxo de Caixa"
        subtitle="Entradas e saídas financeiras"
      />

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <Button variant="outline" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-elevated border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ArrowUpCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entradas</p>
                <p className="text-2xl font-bold text-green-500">
                  R$ {totalEntradas.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <ArrowDownCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saídas</p>
                <p className="text-2xl font-bold text-red-500">
                  R$ {totalSaidas.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`card-elevated border-l-4 ${saldoMes >= 0 ? 'border-l-primary' : 'border-l-destructive'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo do Mês</p>
                <p className={`text-2xl font-bold ${saldoMes >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  R$ {saldoMes.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : cashflowEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma movimentação neste mês</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashflowEntries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {format(entry.date, "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {entry.type === "entrada" ? (
                          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
                            <ArrowUpCircle className="h-3 w-3 mr-1" />
                            Entrada
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30">
                            <ArrowDownCircle className="h-3 w-3 mr-1" />
                            Saída
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        entry.type === "entrada" ? "text-green-500" : "text-red-500"
                      }`}>
                        {entry.type === "entrada" ? "+" : "-"} R$ {entry.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CashflowPage;
