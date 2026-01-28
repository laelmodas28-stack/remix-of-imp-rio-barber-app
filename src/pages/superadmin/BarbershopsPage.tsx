import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Building2, 
  ExternalLink, 
  Settings2, 
  Loader2,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Barbershop {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  subscription?: {
    id: string;
    plan_type: string;
    status: string;
    trial_ends_at: string | null;
    subscription_ends_at: string | null;
    payment_value: number | null;
    paid_at: string | null;
    asaas_payment_link: string | null;
  } | undefined;
}

export function BarbershopsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedBarbershop, setSelectedBarbershop] = useState<Barbershop | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Edit form state
  const [editPlanType, setEditPlanType] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [extendDays, setExtendDays] = useState("");

  // Fetch all barbershops with subscriptions
  const { data: barbershops, isLoading } = useQuery({
    queryKey: ["superadmin-barbershops"],
    queryFn: async () => {
      const { data: shops, error: shopsError } = await supabase
        .from("barbershops")
        .select("id, name, slug, is_active, created_at")
        .order("created_at", { ascending: false });

      if (shopsError) throw shopsError;

      // Get subscriptions for all barbershops
      const { data: subs, error: subsError } = await supabase
        .from("barbershop_subscriptions")
        .select("id, barbershop_id, plan_type, status, trial_ends_at, subscription_ends_at, payment_value, paid_at, asaas_payment_link");

      if (subsError) throw subsError;

      // Merge subscriptions with barbershops
      const merged = shops?.map((shop) => ({
        ...shop,
        subscription: subs?.find((sub) => sub.barbershop_id === shop.id),
      }));

      return merged as Barbershop[];
    },
  });

  // Update subscription mutation
  const updateSubscription = useMutation({
    mutationFn: async ({
      barbershopId,
      planType,
      status,
      notes,
      extendTrialDays,
    }: {
      barbershopId: string;
      planType: string;
      status: string;
      notes: string;
      extendTrialDays?: number;
    }) => {
      const existingSub = selectedBarbershop?.subscription;

      const updateData: any = {
        plan_type: planType,
        status,
        notes,
      };

      if (extendTrialDays && planType === "trial") {
        const currentEnd = existingSub?.trial_ends_at
          ? new Date(existingSub.trial_ends_at)
          : new Date();
        const newEnd = new Date(currentEnd.getTime() + extendTrialDays * 24 * 60 * 60 * 1000);
        updateData.trial_ends_at = newEnd.toISOString();
      }

      if (planType !== "trial" && status === "active") {
        // Set subscription dates for paid plans
        updateData.subscription_started_at = new Date().toISOString();
        updateData.subscription_ends_at = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString();
      }

      if (existingSub) {
        // Update existing subscription
        const { error } = await supabase
          .from("barbershop_subscriptions")
          .update(updateData)
          .eq("id", existingSub.id);

        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase
          .from("barbershop_subscriptions")
          .insert({
            barbershop_id: barbershopId,
            ...updateData,
            created_by: user?.id,
          });

        if (error) throw error;
      }

      // Log activity
      await supabase.from("platform_activity_logs").insert({
        action: existingSub ? "subscription_updated" : "subscription_created",
        entity_type: "subscription",
        entity_id: barbershopId,
        performed_by: user?.id,
        details: { planType, status, notes },
      });
    },
    onSuccess: () => {
      toast.success("Assinatura atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["superadmin-barbershops"] });
      setIsEditDialogOpen(false);
      setSelectedBarbershop(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar assinatura");
    },
  });

  // Toggle barbershop active status
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("barbershops")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;

      await supabase.from("platform_activity_logs").insert({
        action: isActive ? "barbershop_activated" : "barbershop_deactivated",
        entity_type: "barbershop",
        entity_id: id,
        performed_by: user?.id,
      });
    },
    onSuccess: () => {
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["superadmin-barbershops"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar status");
    },
  });

  const handleEditClick = (barbershop: Barbershop) => {
    setSelectedBarbershop(barbershop);
    setEditPlanType(barbershop.subscription?.plan_type || "trial");
    setEditStatus(barbershop.subscription?.status || "active");
    setEditNotes("");
    setExtendDays("");
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedBarbershop) return;

    updateSubscription.mutate({
      barbershopId: selectedBarbershop.id,
      planType: editPlanType,
      status: editStatus,
      notes: editNotes,
      extendTrialDays: extendDays ? parseInt(extendDays) : undefined,
    });
  };

  const filteredBarbershops = barbershops?.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.slug.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (barbershop: Barbershop) => {
    if (!barbershop.subscription) {
      return <Badge variant="outline">Sem assinatura</Badge>;
    }

    const { plan_type, status, trial_ends_at, payment_value, paid_at } = barbershop.subscription;

    if (status === "pending_payment") {
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" />
            Aguardando Pagamento
          </Badge>
          {payment_value && (
            <span className="text-xs text-muted-foreground">
              {plan_type} - R$ {payment_value.toFixed(2)}
            </span>
          )}
        </div>
      );
    }

    if (status === "suspended") {
      return <Badge variant="destructive">Suspenso</Badge>;
    }

    if (plan_type === "trial" && trial_ends_at) {
      const daysLeft = differenceInDays(new Date(trial_ends_at), new Date());
      if (daysLeft <= 0) {
        return <Badge variant="destructive">Trial expirado</Badge>;
      }
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Trial ({daysLeft}d)
        </Badge>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <Badge variant="default" className="bg-green-600 w-fit capitalize">
          {plan_type}
        </Badge>
        {paid_at && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-600" />
            Pago
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Barbearias</h1>
        <p className="text-muted-foreground">
          Gerencie todas as barbearias cadastradas na plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Barbearias</CardTitle>
              <CardDescription>
                {barbershops?.length || 0} barbearias cadastradas
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar barbearia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
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
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBarbershops?.map((barbershop) => (
                  <TableRow key={barbershop.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {barbershop.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/b/${barbershop.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        /{barbershop.slug}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      {barbershop.is_active ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(barbershop)}</TableCell>
                    <TableCell>
                      {format(new Date(barbershop.created_at), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleActive.mutate({
                              id: barbershop.id,
                              isActive: !barbershop.is_active,
                            })
                          }
                        >
                          {barbershop.is_active ? "Desativar" : "Ativar"}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleEditClick(barbershop)}
                        >
                          <Settings2 className="w-4 h-4 mr-1" />
                          Plano
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Assinatura</DialogTitle>
            <DialogDescription>
              {selectedBarbershop?.name} (/{selectedBarbershop?.slug})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Plano</Label>
              <Select value={editPlanType} onValueChange={setEditPlanType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (Teste)</SelectItem>
                  <SelectItem value="basic">Básico</SelectItem>
                  <SelectItem value="professional">Profissional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editPlanType === "trial" && (
              <div className="space-y-2">
                <Label>Estender Trial (dias)</Label>
                <Input
                  type="number"
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  placeholder="Ex: 7"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Notas internas sobre esta alteração..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updateSubscription.isPending}>
              {updateSubscription.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BarbershopsPage;
