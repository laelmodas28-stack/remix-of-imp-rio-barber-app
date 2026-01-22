import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { CreditCard, Plus, Loader2, CheckCircle, Clock, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export function PayoutsPage() {
  const { barbershop } = useBarbershopContext();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPayout, setNewPayout] = useState({
    professional_id: "",
    gross_amount: "",
    commission_rate: "50",
    period_start: format(new Date(), "yyyy-MM-dd"),
    period_end: format(new Date(), "yyyy-MM-dd"),
  });

  // Fetch commission payments
  const { data: payouts, isLoading } = useQuery({
    queryKey: ["payouts", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("commission_payments")
        .select(`
          *,
          professional:professionals!inner(id, name, barbershop_id)
        `)
        .eq("professional.barbershop_id", barbershop.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  // Fetch professionals
  const { data: professionals } = useQuery({
    queryKey: ["professionals-for-payout", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  // Create payout mutation
  const createPayoutMutation = useMutation({
    mutationFn: async (data: typeof newPayout) => {
      if (!barbershop?.id) throw new Error("Barbearia não encontrada");
      
      const grossAmount = parseFloat(data.gross_amount);
      const commissionRate = parseFloat(data.commission_rate);
      const commissionAmount = (grossAmount * commissionRate) / 100;
      
      const { error } = await supabase
        .from("commission_payments")
        .insert({
          barbershop_id: barbershop.id,
          professional_id: data.professional_id,
          gross_amount: grossAmount,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          period_start: data.period_start,
          period_end: data.period_end,
          status: "pending",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      setCreateDialogOpen(false);
      setNewPayout({
        professional_id: "",
        gross_amount: "",
        commission_rate: "50",
        period_start: format(new Date(), "yyyy-MM-dd"),
        period_end: format(new Date(), "yyyy-MM-dd"),
      });
      toast.success("Pagamento criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar pagamento");
    },
  });

  // Update payout status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "paid") {
        updates.paid_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("commission_payments")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      toast.success("Status atualizado!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar status");
    },
  });

  const totalPending = payouts?.filter(p => p.status === "pending").reduce((sum, p) => sum + Number(p.commission_amount || 0), 0) || 0;
  const totalPaid = payouts?.filter(p => p.status === "paid").reduce((sum, p) => sum + Number(p.commission_amount || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pagamentos" subtitle="Comissões e pagamentos aos profissionais" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagamentos"
        subtitle="Comissões e pagamentos aos profissionais"
        actions={
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Pagamento
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-elevated border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pagamentos Pendentes</p>
                <p className="text-2xl font-bold">R$ {totalPending.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pago</p>
                <p className="text-2xl font-bold">R$ {totalPaid.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payouts Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts && payouts.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Bruto</TableHead>
                    <TableHead>Comissão (%)</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="font-medium">
                        {payout.professional?.name}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(payout.period_start), "dd/MM", { locale: ptBR })} - {format(parseISO(payout.period_end), "dd/MM", { locale: ptBR })}
                      </TableCell>
                      <TableCell>R$ {Number(payout.gross_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>{payout.commission_rate}%</TableCell>
                      <TableCell className="font-semibold">
                        R$ {Number(payout.commission_amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            payout.status === "paid"
                              ? "bg-green-500/20 text-green-500"
                              : "bg-yellow-500/20 text-yellow-500"
                          }
                        >
                          {payout.status === "paid" ? "Pago" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payout.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: payout.id, status: "paid" })}
                            disabled={updateStatusMutation.isPending}
                          >
                            {updateStatusMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Marcar como Pago"
                            )}
                          </Button>
                        )}
                        {payout.status === "paid" && payout.paid_at && (
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(payout.paid_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-1">Nenhum pagamento registrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie um novo pagamento para um profissional
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Pagamento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select
                value={newPayout.professional_id}
                onValueChange={(v) => setNewPayout((prev) => ({ ...prev, professional_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals?.map((pro) => (
                    <SelectItem key={pro.id} value={pro.id}>
                      {pro.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Período Início</Label>
                <Input
                  type="date"
                  value={newPayout.period_start}
                  onChange={(e) => setNewPayout((prev) => ({ ...prev, period_start: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Período Fim</Label>
                <Input
                  type="date"
                  value={newPayout.period_end}
                  onChange={(e) => setNewPayout((prev) => ({ ...prev, period_end: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Bruto (R$)</Label>
                <Input
                  type="number"
                  value={newPayout.gross_amount}
                  onChange={(e) => setNewPayout((prev) => ({ ...prev, gross_amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Comissão (%)</Label>
                <Input
                  type="number"
                  value={newPayout.commission_rate}
                  onChange={(e) => setNewPayout((prev) => ({ ...prev, commission_rate: e.target.value }))}
                  placeholder="50"
                />
              </div>
            </div>

            {newPayout.gross_amount && newPayout.commission_rate && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Valor da Comissão:</p>
                <p className="text-lg font-bold">
                  R$ {((parseFloat(newPayout.gross_amount) * parseFloat(newPayout.commission_rate)) / 100).toFixed(2)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createPayoutMutation.mutate(newPayout)}
              disabled={createPayoutMutation.isPending || !newPayout.professional_id || !newPayout.gross_amount}
            >
              {createPayoutMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PayoutsPage;
