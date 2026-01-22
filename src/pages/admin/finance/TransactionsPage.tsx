import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Receipt, 
  Search, 
  Filter, 
  Download, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type TransactionStatus = "all" | "completed" | "pending" | "failed" | "refunded";
type TransactionType = "all" | "booking" | "subscription";

interface Transaction {
  id: string;
  amount: number;
  status: string | null;
  payment_method: string | null;
  mercadopago_status: string | null;
  transaction_id: string | null;
  created_at: string | null;
  client_id: string;
  plan_id: string | null;
  subscription_id: string | null;
}

export function TransactionsPage() {
  const { barbershop } = useBarbershopContext();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus>("all");
  const [typeFilter, setTypeFilter] = useState<TransactionType>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // payment_transactions table - query as any since types may not be updated yet
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [] as Transaction[];
      try {
        const { data, error } = await (supabase as any)
          .from("payment_transactions")
          .select("*")
          .eq("barbershop_id", barbershop.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []) as Transaction[];
      } catch {
        return [] as Transaction[];
      }
    },
    enabled: !!barbershop?.id,
  });

  // Also fetch bookings as "virtual transactions" - use total_price column
  const { data: bookings } = useQuery({
    queryKey: ["booking-transactions", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          total_price,
          status,
          booking_date,
          booking_time,
          created_at,
          client_id,
          service:services(name),
          professional:professionals(name)
        `)
        .eq("barbershop_id", barbershop.id)
        .eq("status", "completed")
        .order("booking_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed":
      case "approved":
        return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "failed":
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30"><XCircle className="h-3 w-3 mr-1" />Recusado</Badge>;
      case "refunded":
        return <Badge className="bg-purple-500/20 text-purple-500 hover:bg-purple-500/30"><AlertCircle className="h-3 w-3 mr-1" />Reembolsado</Badge>;
      default:
        return <Badge variant="secondary">{status || "—"}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    switch (method) {
      case "pix": return "PIX";
      case "credit_card": return "Cartão de Crédito";
      case "debit_card": return "Cartão de Débito";
      case "cash": return "Dinheiro";
      case "boleto": return "Boleto";
      default: return method || "Não informado";
    }
  };

  // Combine transactions and bookings for display
  const allTransactions = [
    ...(transactions || []).map((t: Transaction) => ({
      ...t,
      type: "payment" as const,
      displayDate: t.created_at ? new Date(t.created_at) : new Date(),
    })),
    ...(bookings || []).map((b: any) => ({
      id: b.id,
      amount: Number(b.total_price || 0),
      status: "completed",
      payment_method: "service",
      mercadopago_status: null,
      transaction_id: null,
      created_at: b.created_at,
      client_id: b.client_id,
      plan_id: null,
      subscription_id: null,
      type: "booking" as const,
      displayDate: new Date(b.booking_date),
      serviceName: b.service?.name,
      professionalName: b.professional?.name,
    })),
  ].sort((a, b) => b.displayDate.getTime() - a.displayDate.getTime());

  const filteredTransactions = allTransactions.filter((t: any) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (typeFilter === "booking" && t.type !== "booking") return false;
    if (typeFilter === "subscription" && !t.subscription_id) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      if (t.transaction_id?.toLowerCase().includes(searchLower)) return true;
      if (t.id.toLowerCase().includes(searchLower)) return true;
      return false;
    }
    return true;
  });

  const totalAmount = filteredTransactions
    .filter((t: any) => t.status === "completed" || t.status === "approved")
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

  const handleExport = () => {
    const csv = [
      ["Data", "Tipo", "Valor", "Status", "Método", "ID Transação"].join(","),
      ...filteredTransactions.map(t => [
        format(t.displayDate, "dd/MM/yyyy HH:mm"),
        t.type === "booking" ? "Atendimento" : "Pagamento",
        t.amount.toFixed(2),
        t.status,
        t.payment_method,
        t.transaction_id || t.id,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacoes-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <AdminPageScaffold
      title="Transações"
      subtitle="Histórico de todas as transações financeiras"
      icon={Receipt}
      actions={
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Summary Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total no período</p>
                <p className="text-3xl font-bold">R$ {totalAmount.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{filteredTransactions.length} transações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID da transação..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TransactionStatus)}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">Aprovado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="failed">Recusado</SelectItem>
                  <SelectItem value="refunded">Reembolsado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionType)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="booking">Atendimentos</SelectItem>
                  <SelectItem value="subscription">Assinaturas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Nenhuma transação encontrada</h3>
                <p className="text-muted-foreground">
                  Ajuste os filtros ou aguarde novas transações
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {format(transaction.displayDate, "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(transaction.displayDate, "HH:mm")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {transaction.type === "booking" ? "Atendimento" : 
                           transaction.subscription_id ? "Assinatura" : "Pagamento"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.type === "booking" && (transaction as any).serviceName ? (
                          <div>
                            <p className="font-medium">{(transaction as any).serviceName}</p>
                            <p className="text-xs text-muted-foreground">
                              {(transaction as any).professionalName}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            {transaction.transaction_id || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        R$ {Number(transaction.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodLabel(transaction.payment_method)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Transação</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-mono text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="text-xl font-bold">R$ {Number(selectedTransaction.amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedTransaction.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Método</p>
                  <p>{getPaymentMethodLabel(selectedTransaction.payment_method)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p>
                    {selectedTransaction.created_at 
                      ? format(new Date(selectedTransaction.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : "—"
                    }
                  </p>
                </div>
                {selectedTransaction.transaction_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">ID da Transação</p>
                    <p className="font-mono text-sm">{selectedTransaction.transaction_id}</p>
                  </div>
                )}
                {selectedTransaction.mercadopago_status && (
                  <div>
                    <p className="text-sm text-muted-foreground">Status MercadoPago</p>
                    <p>{selectedTransaction.mercadopago_status}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminPageScaffold>
  );
}

export default TransactionsPage;
