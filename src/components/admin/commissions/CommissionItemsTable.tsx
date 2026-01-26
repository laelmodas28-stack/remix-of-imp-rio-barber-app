import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CommissionItem, useMarkCommissionPaid } from "@/hooks/useCommissionItems";
import { toast } from "sonner";
import { BulkPaymentDialog } from "./BulkPaymentDialog";

interface CommissionItemsTableProps {
  items: CommissionItem[];
  count: number;
  isLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isAdmin: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

const sourceTypeLabels: Record<string, string> = {
  APPOINTMENT: 'Agendamento',
  ORDER: 'Pedido',
  INVOICE: 'Fatura',
  OTHER: 'Outro',
};

export function CommissionItemsTable({
  items,
  count,
  isLoading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isAdmin,
}: CommissionItemsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const markPaidMutation = useMarkCommissionPaid();

  const totalPages = Math.ceil(count / pageSize);
  const pendingItems = items.filter(item => item.payment_status === 'PENDING');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(pendingItems.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleMarkSinglePaid = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (item?.payment_status === 'PAID') {
      toast.error("Esta comissão já foi paga");
      return;
    }
    await markPaidMutation.mutateAsync({ itemIds: [id] });
    setSelectedIds(prev => prev.filter(i => i !== id));
  };

  const handleBulkPaymentConfirm = async (note?: string) => {
    const validIds = selectedIds.filter(id => {
      const item = items.find(i => i.id === id);
      return item?.payment_status === 'PENDING';
    });

    if (validIds.length === 0) {
      toast.error("Nenhuma comissão pendente selecionada");
      return;
    }

    await markPaidMutation.mutateAsync({ itemIds: validIds, note });
    setSelectedIds([]);
    setBulkDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {isAdmin && selectedIds.length > 0 && (
        <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} item(ns) selecionado(s)
          </span>
          <Button
            size="sm"
            onClick={() => setBulkDialogOpen(true)}
            disabled={markPaidMutation.isPending}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Marcar como pago
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds([])}
          >
            Limpar seleção
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={pendingItems.length > 0 && selectedIds.length === pendingItems.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>Data</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor Bruto</TableHead>
              <TableHead className="text-right">Taxa</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="w-24">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 9 : 7} className="h-24 text-center text-muted-foreground">
                  Nenhuma comissão encontrada
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  {isAdmin && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                        disabled={item.payment_status === 'PAID'}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    {format(new Date(item.occurred_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={item.professional?.photo_url || undefined} />
                        <AvatarFallback>
                          {item.professional?.name?.charAt(0) || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{item.professional?.name || 'Desconhecido'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{sourceTypeLabels[item.source_type] || item.source_type}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.gross_amount)}</TableCell>
                  <TableCell className="text-right">{item.applied_commission_rate}%</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.commission_amount)}
                  </TableCell>
                  <TableCell>
                    {item.payment_status === 'PAID' ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        Pago
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {item.payment_status === 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkSinglePaid(item.id)}
                          disabled={markPaidMutation.isPending}
                        >
                          Pagar
                        </Button>
                      )}
                      {item.payment_status === 'PAID' && item.paid_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.paid_at), "dd/MM/yy")}
                        </span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Itens por página:</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span>
            {Math.min((page - 1) * pageSize + 1, count)}-{Math.min(page * pageSize, count)} de {count}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Página {page} de {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bulk Payment Dialog */}
      <BulkPaymentDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        selectedCount={selectedIds.length}
        onConfirm={handleBulkPaymentConfirm}
        isPending={markPaidMutation.isPending}
      />
    </div>
  );
}
