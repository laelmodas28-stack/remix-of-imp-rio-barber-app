import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Crown, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Users,
  BarChart3,
  Bell,
  Calendar,
  Palette,
  MessageSquare,
  Loader2,
  ExternalLink
} from "lucide-react";
import { format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface SubscriptionSummaryProps {
  barbershopId: string;
}

interface BarbershopSubscription {
  id: string;
  barbershop_id: string;
  plan_type: string;
  status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  paid_at: string | null;
  payment_value: number | null;
  payment_method: string | null;
  asaas_payment_link: string | null;
}

interface Barbershop {
  id: string;
  slug: string;
  name: string;
}

const PLAN_FEATURES: Record<string, string[]> = {
  essencial: [
    "1 profissional",
    "Dashboard financeiro completo",
    "Relatórios detalhados",
    "Notificações WhatsApp e e-mail",
    "Agendamentos ilimitados",
    "Sistema 100% personalizado",
    "Suporte via WhatsApp",
  ],
  profissional: [
    "Até 3 profissionais",
    "Dashboard financeiro completo",
    "Relatórios detalhados",
    "Notificações WhatsApp e e-mail",
    "Agendamentos ilimitados",
    "Sistema 100% personalizado",
    "Suporte via WhatsApp",
  ],
  completo: [
    "Profissionais ilimitados",
    "Dashboard financeiro completo",
    "Relatórios detalhados",
    "Notificações WhatsApp e e-mail",
    "Agendamentos ilimitados",
    "Sistema 100% personalizado",
    "Suporte via WhatsApp",
  ],
  trial: [
    "Acesso completo por 7 dias",
    "Teste todas as funcionalidades",
    "Sem compromisso",
  ],
};

const PLAN_NAMES: Record<string, string> = {
  essencial: "Essencial",
  profissional: "Profissional",
  completo: "Completo",
  trial: "Período de Teste",
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  essencial: <Crown className="w-5 h-5" />,
  profissional: <Crown className="w-5 h-5" />,
  completo: <Crown className="w-5 h-5" />,
  trial: <Clock className="w-5 h-5" />,
};

export const SubscriptionSummary = ({ barbershopId }: SubscriptionSummaryProps) => {
  const navigate = useNavigate();

  // Fetch barbershop details
  const { data: barbershop } = useQuery({
    queryKey: ["barbershop-details", barbershopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbershops")
        .select("id, slug, name")
        .eq("id", barbershopId)
        .single();
      
      if (error) throw error;
      return data as Barbershop;
    },
    enabled: !!barbershopId,
  });

  // Fetch subscription
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["barbershop-subscription-summary", barbershopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbershop_subscriptions")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as BarbershopSubscription[];
    },
    enabled: !!barbershopId,
  });

  if (isLoading) {
    return (
      <Card className="border-border mb-8">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return null;
  }

  const now = new Date();

  // Find active subscription (paid or trial)
  const activeSubscription = subscriptions.find(s => 
    (s.status === 'active' && s.subscription_ends_at && isAfter(new Date(s.subscription_ends_at), now)) ||
    (s.status === 'trial' && s.trial_ends_at && isAfter(new Date(s.trial_ends_at), now))
  );

  // If no active subscription found, get the latest one
  const subscription = activeSubscription || subscriptions[0];
  
  const isActive = subscription.status === 'active' && 
    subscription.subscription_ends_at && 
    isAfter(new Date(subscription.subscription_ends_at), now);
  
  const isInTrial = subscription.status === 'trial' && 
    subscription.trial_ends_at && 
    isAfter(new Date(subscription.trial_ends_at), now);

  const isPendingPayment = subscription.status === 'pending_payment';
  const isExpired = !isActive && !isInTrial && !isPendingPayment;

  const planType = subscription.plan_type?.toLowerCase() || 'trial';
  const planName = PLAN_NAMES[planType] || subscription.plan_type || 'Plano';
  const planFeatures = PLAN_FEATURES[planType] || PLAN_FEATURES.trial;
  const planIcon = PLAN_ICONS[planType] || <Crown className="w-5 h-5" />;

  const endDate = isInTrial 
    ? subscription.trial_ends_at 
    : subscription.subscription_ends_at;

  const getStatusBadge = () => {
    if (isActive) {
      return (
        <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Ativo
        </Badge>
      );
    }
    if (isInTrial) {
      return (
        <Badge className="bg-primary/20 text-primary border-primary/30">
          <Clock className="w-3 h-3 mr-1" />
          Período de Teste
        </Badge>
      );
    }
    if (isPendingPayment) {
      return (
        <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
          <Clock className="w-3 h-3 mr-1" />
          Pagamento Pendente
        </Badge>
      );
    }
    return (
      <Badge className="bg-destructive/20 text-destructive border-destructive/30">
        <AlertCircle className="w-3 h-3 mr-1" />
        Expirado
      </Badge>
    );
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return "Não informado";
    switch (method.toUpperCase()) {
      case 'PIX': return 'PIX';
      case 'CREDIT_CARD': return 'Cartão de Crédito';
      case 'BOLETO': return 'Boleto Bancário';
      default: return method;
    }
  };

  const handleUpgrade = () => {
    if (barbershop?.slug) {
      navigate(`/b/${barbershop.slug}/plans`);
    }
  };

  const handleContinuePayment = () => {
    if (subscription.asaas_payment_link) {
      window.open(subscription.asaas_payment_link, '_blank');
    }
  };

  return (
    <Card className="border-border mb-8 overflow-hidden">
      {/* Header with gradient */}
      <div className={`p-6 ${isActive ? 'bg-gradient-to-r from-green-500/10 to-transparent' : isInTrial ? 'bg-gradient-to-r from-primary/10 to-transparent' : 'bg-gradient-to-r from-amber-500/10 to-transparent'}`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isActive ? 'bg-green-500/20 text-green-500' : isInTrial ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-600'}`}>
              {planIcon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">{planName}</h3>
                {getStatusBadge()}
              </div>
              {endDate && (
                <p className="text-sm text-muted-foreground">
                  {isActive || isInTrial ? 'Válido até' : 'Expirou em'}: {format(new Date(endDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {isPendingPayment && subscription.asaas_payment_link && (
              <Button onClick={handleContinuePayment} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Finalizar Pagamento
              </Button>
            )}
            {(isInTrial || isExpired) && (
              <Button onClick={handleUpgrade} variant="premium" className="gap-2">
                <Crown className="w-4 h-4" />
                {isExpired ? 'Assinar Plano' : 'Fazer Upgrade'}
              </Button>
            )}
            {isActive && planType !== 'completo' && (
              <Button onClick={handleUpgrade} variant="outline" className="gap-2">
                <Crown className="w-4 h-4" />
                Mudar Plano
              </Button>
            )}
          </div>
        </div>
      </div>

      <CardContent className="pt-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Payment Info */}
          {(isActive || subscription.paid_at) && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Informações de Pagamento
              </h4>
              <div className="space-y-3">
                {subscription.payment_value && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Valor</span>
                    <span className="font-semibold text-lg">
                      R$ {subscription.payment_value.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}
                {subscription.payment_method && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Método</span>
                    <span>{getPaymentMethodLabel(subscription.payment_method)}</span>
                  </div>
                )}
                {subscription.paid_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pago em</span>
                    <span>{format(new Date(subscription.paid_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                )}
                {subscription.subscription_started_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Início</span>
                    <span>{format(new Date(subscription.subscription_started_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Features */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {isInTrial ? 'Funcionalidades do Teste' : 'Itens Contratados'}
            </h4>
            <ul className="space-y-2">
              {planFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trial warning */}
        {isInTrial && (
          <>
            <Separator className="my-6" />
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Seu período de teste está ativo</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aproveite para explorar todas as funcionalidades. Após o término, assine um plano para continuar usando o sistema.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Expired warning */}
        {isExpired && (
          <>
            <Separator className="my-6" />
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm text-destructive">Sua assinatura expirou</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Para continuar usando o sistema, escolha um plano e realize o pagamento.
                  </p>
                  <Button onClick={handleUpgrade} size="sm" className="mt-3 gap-2">
                    <Crown className="w-4 h-4" />
                    Ver Planos
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionSummary;
