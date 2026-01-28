import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Loader2, 
  CreditCard, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Search,
  MoreHorizontal,
  ExternalLink,
  Play,
  Pause,
  XCircle,
  RefreshCw,
  Calendar,
  DollarSign,
  Users,
  Building2,
  Eye,
  Edit
} from "lucide-react";
import { format, differenceInDays, addDays, addMonths, addYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Subscription {
  id: string;
  barbershop_id: string;
  plan_type: string;
  status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  payment_value: number | null;
  payment_method: string | null;
  paid_at: string | null;
  asaas_payment_id: string | null;
  asaas_payment_link: string | null;
  asaas_customer_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  barbershop: {
    name: string;
    slug: string;
    owner_id: string;
  } | null;
}

interface PlatformPlan {
  id: string;
  name: string;
  price: number;
  billing_cycle: string;
  max_professionals: number | null;
}

export function SubscriptionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Edit form state
  const [editPlanType, setEditPlanType] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [extendDays, setExtendDays] = useState("");
  const [manualActivation, setManualActivation] = useState(false);

  // Fetch platform plans
  const { data: platformPlans } = useQuery({
    queryKey: ["platform-plans-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_plans")
        .select("id, name, price, billing_cycle, max_professionals")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as PlatformPlan[];
    },
  });

  // Get unique plan names for dropdown
  const uniquePlanNames = [...new Set(platformPlans?.map(p => p.name.toLowerCase()) || [])];

  // Fetch all subscriptions with barbershop info
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["superadmin-subscriptions-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbershop_subscriptions")
        .select(`
          *,
          barbershop:barbershops(name, slug, owner_id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Subscription[];
    },
  });

  // Stats
  const stats = {
    total: subscriptions?.length || 0,
    active: subscriptions?.filter((s) => s.status === "active" && s.plan_type !== "trial").length || 0,
    trial: subscriptions?.filter((s) => s.status === "active" && s.plan_type === "trial").length || 0,
    pendingPayment: subscriptions?.filter((s) => s.status === "pending_payment").length || 0,
    expired: subscriptions?.filter((s) => s.status === "expired" || (s.plan_type === "trial" && s.trial_ends_at && new Date(s.trial_ends_at) < new Date())).length || 0,
  };

  // Filter subscriptions based on active tab and search
  const filteredSubscriptions = subscriptions?.filter((sub) => {
    const matchesSearch = 
      sub.barbershop?.name.toLowerCase().includes(search.toLowerCase()) ||
      sub.barbershop?.slug.toLowerCase().includes(search.toLowerCase()) ||
      sub.plan_type.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeTab) {
      case "trial":
        return sub.plan_type === "trial" && sub.status === "active";
      case "active":
        return sub.status === "active" && sub.plan_type !== "trial";
      case "pending":
        return sub.status === "pending_payment";
      case "expired":
        return sub.status === "expired" || 
          (sub.plan_type === "trial" && sub.trial_ends_at && new Date(sub.trial_ends_at) < new Date());
      default:
        return true;
    }
  });

  // Update subscription mutation
  const updateSubscription = useMutation({
    mutationFn: async ({
      subscriptionId,
      planType,
      status,
      notes,
      extendTrialDays,
      activateNow,
    }: {
      subscriptionId: string;
      planType: string;
      status: string;
      notes: string;
      extendTrialDays?: number;
      activateNow?: boolean;
    }) => {
      const updateData: Record<string, unknown> = {
        plan_type: planType,
        status,
        notes,
        updated_at: new Date().toISOString(),
      };

      if (extendTrialDays && planType === "trial") {
        const currentEnd = selectedSubscription?.trial_ends_at
          ? new Date(selectedSubscription.trial_ends_at)
          : new Date();
        const newEnd = addDays(currentEnd, extendTrialDays);
        updateData.trial_ends_at = newEnd.toISOString();
      }

      // Manual activation of paid plan
      if (activateNow && status === "active" && planType !== "trial") {
        updateData.subscription_started_at = new Date().toISOString();
        updateData.paid_at = new Date().toISOString();
        
        // Calculate end date based on billing cycle
        const plan = platformPlans?.find(p => p.name.toLowerCase() === planType);
        const billingCycle = plan?.billing_cycle || "MONTHLY";
        
        let endDate = new Date();
        if (billingCycle === "MONTHLY") endDate = addMonths(new Date(), 1);
        else if (billingCycle === "QUARTERLY") endDate = addMonths(new Date(), 3);
        else if (billingCycle === "YEARLY") endDate = addYears(new Date(), 1);
        
        updateData.subscription_ends_at = endDate.toISOString();
      }

      const { error } = await supabase
        .from("barbershop_subscriptions")
        .update(updateData)
        .eq("id", subscriptionId);

      if (error) throw error;

      // Log activity
      await supabase.from("platform_activity_logs").insert({
        action: "subscription_updated_by_superadmin",
        entity_type: "subscription",
        entity_id: subscriptionId,
        performed_by: user?.id,
        details: { planType, status, notes, activateNow },
      });
    },
    onSuccess: () => {
      toast.success("Assinatura atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["superadmin-subscriptions-full"] });
      setIsEditDialogOpen(false);
      setSelectedSubscription(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar assinatura");
    },
  });

  // Quick actions
  const quickAction = useMutation({
    mutationFn: async ({
      subscriptionId,
      action,
    }: {
      subscriptionId: string;
      action: "activate" | "suspend" | "cancel" | "extend_trial";
    }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      switch (action) {
        case "activate":
          updateData.status = "active";
          updateData.paid_at = new Date().toISOString();
          updateData.subscription_started_at = new Date().toISOString();
          updateData.subscription_ends_at = addMonths(new Date(), 1).toISOString();
          break;
        case "suspend":
          updateData.status = "suspended";
          break;
        case "cancel":
          updateData.status = "cancelled";
          break;
        case "extend_trial":
          const sub = subscriptions?.find(s => s.id === subscriptionId);
          const currentEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : new Date();
          updateData.trial_ends_at = addDays(currentEnd, 7).toISOString();
          updateData.status = "active";
          break;
      }

      const { error } = await supabase
        .from("barbershop_subscriptions")
        .update(updateData)
        .eq("id", subscriptionId);

      if (error) throw error;

      await supabase.from("platform_activity_logs").insert({
        action: `subscription_${action}`,
        entity_type: "subscription",
        entity_id: subscriptionId,
        performed_by: user?.id,
      });
    },
    onSuccess: (_, variables) => {
      const actionLabels: Record<string, string> = {
        activate: "ativada",
        suspend: "suspensa",
        cancel: "cancelada",
        extend_trial: "trial estendido (+7 dias)",
      };
      toast.success(`Assinatura ${actionLabels[variables.action]}!`);
      queryClient.invalidateQueries({ queryKey: ["superadmin-subscriptions-full"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao executar ação");
    },
  });

  const handleEditClick = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setEditPlanType(subscription.plan_type);
    setEditStatus(subscription.status);
    setEditNotes(subscription.notes || "");
    setExtendDays("");
    setManualActivation(false);
    setIsEditDialogOpen(true);
  };

  const handleViewClick = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsViewDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedSubscription) return;

    updateSubscription.mutate({
      subscriptionId: selectedSubscription.id,
      planType: editPlanType,
      status: editStatus,
      notes: editNotes,
      extendTrialDays: extendDays ? parseInt(extendDays) : undefined,
      activateNow: manualActivation,
    });
  };

  const getStatusBadge = (sub: Subscription) => {
    if (sub.status === "pending_payment") {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-500/20 text-yellow-600">
          <Clock className="w-3 h-3" />
          Aguardando Pagamento
        </Badge>
      );
    }

    if (sub.status === "suspended") {
      return <Badge variant="destructive">Suspenso</Badge>;
    }

    if (sub.status === "cancelled") {
      return <Badge variant="secondary">Cancelado</Badge>;
    }

    if (sub.status === "expired") {
      return <Badge variant="destructive">Expirado</Badge>;
    }

    if (sub.plan_type === "trial") {
      const daysLeft = sub.trial_ends_at 
        ? differenceInDays(new Date(sub.trial_ends_at), new Date())
        : 0;
      
      if (daysLeft <= 0) {
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Trial Expirado
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

  const getPlanBadge = (planType: string, paymentValue?: number | null) => {
    const colors: Record<string, string> = {
      trial: "bg-blue-500/20 text-blue-600 border-blue-500/30",
      essencial: "bg-gray-500/20 text-gray-600 border-gray-500/30",
      profissional: "bg-purple-500/20 text-purple-600 border-purple-500/30",
      completo: "bg-primary/20 text-primary border-primary/30",
    };

    const planLabel = planType.charAt(0).toUpperCase() + planType.slice(1);

    return (
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className={colors[planType.toLowerCase()] || ""}>
          {planLabel}
        </Badge>
        {paymentValue && paymentValue > 0 && (
          <span className="text-xs text-muted-foreground">
            R$ {paymentValue.toFixed(2)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Assinaturas</h1>
        <p className="text-muted-foreground">
          Controle completo sobre todas as assinaturas da plataforma
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab("all")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-500/50 transition-colors" onClick={() => setActiveTab("active")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Planos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-blue-500/50 transition-colors" onClick={() => setActiveTab("trial")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Em Trial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.trial}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-yellow-500/50 transition-colors" onClick={() => setActiveTab("pending")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-yellow-600" />
              Aguardando Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingPayment}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-red-500/50 transition-colors" onClick={() => setActiveTab("expired")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Expirados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Assinaturas
              </CardTitle>
              <CardDescription>
                {filteredSubscriptions?.length || 0} registros encontrados
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar barbearia ou plano..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="trial">Trial</TabsTrigger>
              <TabsTrigger value="active">Ativos</TabsTrigger>
              <TabsTrigger value="pending">Aguardando Pagamento</TabsTrigger>
              <TabsTrigger value="expired">Expirados</TabsTrigger>
            </TabsList>
          </Tabs>
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
                  <TableHead>Plano Escolhido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions?.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p>{sub.barbershop?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            /{sub.barbershop?.slug}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(sub.plan_type, sub.payment_value)}</TableCell>
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
                      {sub.paid_at ? (
                        <div className="flex flex-col">
                          <Badge variant="outline" className="text-green-600 border-green-600 w-fit">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Pago
                          </Badge>
                          <span className="text-xs text-muted-foreground mt-1">
                            {format(new Date(sub.paid_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      ) : sub.asaas_payment_link ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 w-fit">
                            <Clock className="w-3 h-3 mr-1" />
                            Pendente
                          </Badge>
                          <a
                            href={sub.asaas_payment_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            Ver link <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(sub.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewClick(sub)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClick(sub)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar Plano
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {sub.status === "pending_payment" && (
                            <DropdownMenuItem 
                              onClick={() => quickAction.mutate({ subscriptionId: sub.id, action: "activate" })}
                              className="text-green-600"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Ativar Manualmente
                            </DropdownMenuItem>
                          )}
                          {sub.plan_type === "trial" && (
                            <DropdownMenuItem 
                              onClick={() => quickAction.mutate({ subscriptionId: sub.id, action: "extend_trial" })}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Estender Trial (+7 dias)
                            </DropdownMenuItem>
                          )}
                          {sub.status === "active" && (
                            <DropdownMenuItem 
                              onClick={() => quickAction.mutate({ subscriptionId: sub.id, action: "suspend" })}
                              className="text-yellow-600"
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              Suspender
                            </DropdownMenuItem>
                          )}
                          {sub.status !== "cancelled" && (
                            <DropdownMenuItem 
                              onClick={() => quickAction.mutate({ subscriptionId: sub.id, action: "cancel" })}
                              className="text-red-600"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                          {sub.asaas_payment_link && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <a href={sub.asaas_payment_link} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Abrir Link de Pagamento
                                </a>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Detalhes da Assinatura
            </DialogTitle>
            <DialogDescription>
              {selectedSubscription?.barbershop?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedSubscription && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Plano</Label>
                  <p className="font-medium capitalize">{selectedSubscription.plan_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedSubscription)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Valor</Label>
                  <p className="font-medium">
                    {selectedSubscription.payment_value 
                      ? `R$ ${selectedSubscription.payment_value.toFixed(2)}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Método de Pagamento</Label>
                  <p className="font-medium capitalize">{selectedSubscription.payment_method || "-"}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div>
                  <Label className="text-muted-foreground text-xs">ASAAS Payment ID</Label>
                  <p className="font-mono text-sm">{selectedSubscription.asaas_payment_id || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">ASAAS Customer ID</Label>
                  <p className="font-mono text-sm">{selectedSubscription.asaas_customer_id || "-"}</p>
                </div>
                {selectedSubscription.asaas_payment_link && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Link de Pagamento</Label>
                    <a
                      href={selectedSubscription.asaas_payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-sm"
                    >
                      {selectedSubscription.asaas_payment_link}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Início Trial</Label>
                  <p className="text-sm">
                    {selectedSubscription.trial_started_at
                      ? format(new Date(selectedSubscription.trial_started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Fim Trial</Label>
                  <p className="text-sm">
                    {selectedSubscription.trial_ends_at
                      ? format(new Date(selectedSubscription.trial_ends_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Início Assinatura</Label>
                  <p className="text-sm">
                    {selectedSubscription.subscription_started_at
                      ? format(new Date(selectedSubscription.subscription_started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Fim Assinatura</Label>
                  <p className="text-sm">
                    {selectedSubscription.subscription_ends_at
                      ? format(new Date(selectedSubscription.subscription_ends_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Data Pagamento</Label>
                  <p className="text-sm">
                    {selectedSubscription.paid_at
                      ? format(new Date(selectedSubscription.paid_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "-"}
                  </p>
                </div>
              </div>

              {selectedSubscription.notes && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground text-xs">Observações</Label>
                  <p className="text-sm mt-1">{selectedSubscription.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false);
              if (selectedSubscription) handleEditClick(selectedSubscription);
            }}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Assinatura</DialogTitle>
            <DialogDescription>
              {selectedSubscription?.barbershop?.name} (/{selectedSubscription?.barbershop?.slug})
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
                  {uniquePlanNames.map(name => (
                    <SelectItem key={name} value={name}>
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="pending_payment">Aguardando Pagamento</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
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

            {editPlanType !== "trial" && editStatus === "active" && (
              <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                <input
                  type="checkbox"
                  id="manual-activation"
                  checked={manualActivation}
                  onChange={(e) => setManualActivation(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="manual-activation" className="cursor-pointer">
                  <span className="font-medium">Ativar manualmente</span>
                  <p className="text-xs text-muted-foreground">
                    Marca como pago e define datas de início/fim automaticamente
                  </p>
                </Label>
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
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SubscriptionsPage;
