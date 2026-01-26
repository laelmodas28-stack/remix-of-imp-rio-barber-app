import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useProfessionalsWithRates, useRateHistory, ProfessionalWithRate } from "@/hooks/useCommissionRates";
import { EditRateModal } from "./EditRateModal";
import { RateHistoryTable } from "./RateHistoryTable";

export function ProfessionalRatesTab() {
  const { data: professionals = [], isLoading } = useProfessionalsWithRates();
  const [editingProfessional, setEditingProfessional] = useState<ProfessionalWithRate | null>(null);
  const [showHistory, setShowHistory] = useState(false);

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
    <div className="space-y-6">
      {/* Rates Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-medium">Taxas de Comissão por Profissional</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
            <History className="mr-2 h-4 w-4" />
            {showHistory ? "Ocultar histórico" : "Ver histórico"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-right">Taxa de Comissão</TableHead>
                  <TableHead>Última atualização</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professionals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Nenhum profissional encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  professionals.map((prof) => (
                    <TableRow key={prof.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={prof.photo_url || undefined} />
                            <AvatarFallback>
                              {prof.name?.charAt(0) || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{prof.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-lg font-semibold">{prof.commission_rate}%</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {prof.commission_updated_at
                          ? format(new Date(prof.commission_updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : "Nunca atualizado"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingProfessional(prof)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Rate History */}
      {showHistory && <RateHistoryTable />}

      {/* Edit Modal */}
      <EditRateModal
        professional={editingProfessional}
        onClose={() => setEditingProfessional(null)}
      />
    </div>
  );
}
