import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Crown, Plus, Trash2, Edit2, Users, DollarSign, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SubscriptionPlanFormData {
  name: string;
  description: string;
  price: string;
  duration_days: string;
  max_services_per_month: string;
  discount_percentage: string;
  services_included: string[];
}

const initialFormData: SubscriptionPlanFormData = {
  name: "",
  description: "",
  price: "",
  duration_days: "30",
  max_services_per_month: "",
  discount_percentage: "",
  services_included: [],
};

export function SubscriptionsPage() {
  const { barbershop } = useBarbershopContext();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [formData, setFormData] = useState<SubscriptionPlanFormData>(initialFormData);

  // Fetch subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["subscription-plans-admin", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("price");
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id,
  });

  // Fetch services for selection
  const { data: services } = useQuery({
    queryKey: ["services-for-plans", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id,
  });

  // Fetch active subscriptions count
  const { data: subscriptionsCount } = useQuery({
    queryKey: ["subscriptions-count", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return 0;
      const { count, error } = await supabase
        .from("client_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("barbershop_id", barbershop.id)
        .eq("status", "active");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!barbershop?.id,
  });

  // Create/Update mutation
  const savePlanMutation = useMutation({
    mutationFn: async (data: SubscriptionPlanFormData) => {
      if (!barbershop?.id) throw new Error("Barbearia não encontrada");

      const planData = {
        barbershop_id: barbershop.id,
        name: data.name,
        description: data.description || null,
        price: parseFloat(data.price),
        duration_days: parseInt(data.duration_days),
        services_included: data.services_included,
        max_services_per_month: data.max_services_per_month ? parseInt(data.max_services_per_month) : null,
        discount_percentage: data.discount_percentage ? parseFloat(data.discount_percentage) : null,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from("subscription_plans")
          .update(planData)
          .eq("id", editingPlan);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subscription_plans")
          .insert(planData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPlan ? "Plano atualizado!" : "Plano criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["subscription-plans-admin"] });
      handleCloseForm();
    },
    onError: (error) => {
      console.error("Erro ao salvar plano:", error);
      toast.error("Erro ao salvar plano");
    },
  });

  // Delete mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from("subscription_plans")
        .delete()
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano excluído");
      queryClient.invalidateQueries({ queryKey: ["subscription-plans-admin"] });
    },
    onError: (error) => {
      console.error("Erro ao excluir plano:", error);
      toast.error("Erro ao excluir plano");
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ planId, isActive }: { planId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ is_active: isActive })
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans-admin"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPlan(null);
    setFormData(initialFormData);
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan.id);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      price: plan.price.toString(),
      duration_days: plan.duration_days.toString(),
      max_services_per_month: plan.max_services_per_month?.toString() || "",
      discount_percentage: plan.discount_percentage?.toString() || "",
      services_included: plan.services_included || [],
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    savePlanMutation.mutate(formData);
  };

  const toggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      services_included: prev.services_included.includes(serviceId)
        ? prev.services_included.filter(id => id !== serviceId)
        : [...prev.services_included, serviceId],
    }));
  };

  const getServiceName = (serviceId: string) => {
    return services?.find(s => s.id === serviceId)?.name || serviceId;
  };

  return (
    <AdminPageScaffold
      title="Planos de Assinatura"
      subtitle="Gerencie os planos mensais para seus clientes"
      icon={Crown}
      actionLabel="Novo Plano"
      onAction={() => setIsFormOpen(true)}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/20">
                  <Crown className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Planos Ativos</p>
                  <p className="text-2xl font-bold">
                    {plans?.filter(p => p.is_active).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-accent">
                  <Users className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assinantes Ativos</p>
                  <p className="text-2xl font-bold">{subscriptionsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-secondary">
                  <DollarSign className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Planos</p>
                  <p className="text-2xl font-bold">{plans?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plans List */}
        {plansLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : plans && plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <Card key={plan.id} className={`border-border ${!plan.is_active ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {plan.description || "Sem descrição"}
                      </CardDescription>
                    </div>
                    <Badge variant={plan.is_active ? "default" : "secondary"}>
                      {plan.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-primary">
                      R$ {plan.price?.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>

                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>Duração: {plan.duration_days} dias</p>
                    {plan.max_services_per_month && (
                      <p>Limite: {plan.max_services_per_month} serviços/mês</p>
                    )}
                    {plan.discount_percentage && (
                      <p>Desconto: {plan.discount_percentage}%</p>
                    )}
                  </div>

                  {plan.services_included && plan.services_included.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Serviços incluídos:</p>
                      <div className="flex flex-wrap gap-1">
                        {plan.services_included.slice(0, 3).map((serviceId: string) => (
                          <Badge key={serviceId} variant="outline" className="text-xs">
                            {getServiceName(serviceId)}
                          </Badge>
                        ))}
                        {plan.services_included.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{plan.services_included.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={plan.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ planId: plan.id, isActive: checked })
                        }
                      />
                      <span className="text-sm">Ativo</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPlan(plan)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O plano será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePlanMutation.mutate(plan.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Crown className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground text-center mb-4">
                Nenhum plano de assinatura criado ainda
              </p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Plano
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Plan Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {editingPlan ? "Editar Plano" : "Criar Novo Plano de Assinatura"}
            </DialogTitle>
            <DialogDescription>
              Configure um plano mensal para seus clientes
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-name">Nome do Plano *</Label>
                <Input
                  id="plan-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Plano Premium"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-price">Preço Mensal (R$) *</Label>
                <Input
                  id="plan-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="150.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-description">Descrição</Label>
              <Textarea
                id="plan-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva os benefícios do plano"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duração (dias)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-services">Serviços por Mês</Label>
                <Input
                  id="max-services"
                  type="number"
                  value={formData.max_services_per_month}
                  onChange={(e) => setFormData({ ...formData, max_services_per_month: e.target.value })}
                  placeholder="Ilimitado"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Desconto (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  step="0.01"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Serviços Incluídos</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg max-h-48 overflow-y-auto">
                {services?.length ? (
                  services.map((service) => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`service-${service.id}`}
                        checked={formData.services_included.includes(service.id)}
                        onCheckedChange={() => toggleService(service.id)}
                      />
                      <label
                        htmlFor={`service-${service.id}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {service.name} - R$ {service.price?.toFixed(2)}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground col-span-2">
                    Nenhum serviço cadastrado
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savePlanMutation.isPending}>
                {savePlanMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingPlan ? (
                  "Salvar Alterações"
                ) : (
                  "Criar Plano"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPageScaffold>
  );
}

export default SubscriptionsPage;
