import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useBarbershop } from "@/hooks/useBarbershop";
import { usePlatformPlans, BillingPeriod } from "@/hooks/usePlatformPlans";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { toast } from "sonner";
import { 
  Check, 
  Crown, 
  Loader2, 
  Rocket, 
  Shield, 
  Users, 
  Scissors, 
  BarChart3, 
  MessageSquare,
  Building2,
  Headphones,
  ExternalLink,
  AlertTriangle,
  Lock
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const featureIcons: Record<string, React.ReactNode> = {
  profission: <Users className="w-4 h-4" />,
  dashboard: <BarChart3 className="w-4 h-4" />,
  relatório: <BarChart3 className="w-4 h-4" />,
  notificaç: <MessageSquare className="w-4 h-4" />,
  whatsapp: <MessageSquare className="w-4 h-4" />,
  agendamento: <Shield className="w-4 h-4" />,
  suporte: <Headphones className="w-4 h-4" />,
  sistema: <Building2 className="w-4 h-4" />,
  desconto: <Crown className="w-4 h-4" />,
};

const getFeatureIcon = (feature: string) => {
  const lowerFeature = feature.toLowerCase();
  for (const [key, icon] of Object.entries(featureIcons)) {
    if (lowerFeature.includes(key)) return icon;
  }
  return <Check className="w-4 h-4" />;
};

const formatPrice = (price: number) => {
  return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const PlatformPlans = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { barbershop } = useBarbershop();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('MONTHLY');
  const { plans, isLoading, createCheckout } = usePlatformPlans(billingPeriod);
  const { subscription, trialExpired, hasActiveSubscription, isLoading: trialLoading } = useTrialStatus(barbershop?.id);
  
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const getDiscount = () => {
    if (billingPeriod === 'QUARTERLY') return 10;
    if (billingPeriod === 'YEARLY') return 20;
    return 0;
  };

  const getPeriodLabel = () => {
    if (billingPeriod === 'QUARTERLY') return '/trimestre';
    if (billingPeriod === 'YEARLY') return '/ano';
    return '/mês';
  };

  const getMonthlyEquivalent = (price: number) => {
    if (billingPeriod === 'QUARTERLY') return price / 3;
    if (billingPeriod === 'YEARLY') return price / 12;
    return price;
  };

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      toast.error("Faça login para continuar");
      navigate("/auth");
      return;
    }

    if (!barbershop) {
      toast.error("Nenhuma barbearia encontrada");
      return;
    }

    // Check if already has active subscription
    if (subscription?.status === 'active' && subscription?.subscription_ends_at) {
      const endDate = new Date(subscription.subscription_ends_at);
      if (endDate > new Date()) {
        toast.info(`Você já possui uma assinatura ativa até ${endDate.toLocaleDateString('pt-BR')}`);
        return;
      }
    }

    setSelectedPlanId(planId);

    try {
      const result = await createCheckout.mutateAsync({
        planId,
        barbershopId: barbershop.id,
      });

      if (result.invoiceUrl) {
        setCheckoutUrl(result.invoiceUrl);
        setShowPaymentDialog(true);
      }
    } catch (error) {
      // Error is handled in mutation
    } finally {
      setSelectedPlanId(null);
    }
  };

  const handleOpenCheckout = () => {
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
      setShowPaymentDialog(false);
      setCheckoutUrl(null);
      toast.info("Após o pagamento, sua assinatura será ativada automaticamente.");
    }
  };

  const isPlanLoading = (planId: string) => 
    createCheckout.isPending && selectedPlanId === planId;

  // Check if system is blocked (trial expired without active subscription)
  const isSystemBlocked = trialExpired && !hasActiveSubscription;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        {/* Trial Expired Alert - System Blocked */}
        {isSystemBlocked && (
          <Alert variant="destructive" className="mb-8 border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="flex items-center gap-2 text-lg">
              <Lock className="w-5 h-5" />
              Sistema Bloqueado - Período de Teste Encerrado
            </AlertTitle>
            <AlertDescription className="mt-2 text-base">
              Seu período de teste de <strong>7 dias</strong> terminou. Para continuar usando todas as funcionalidades 
              do sistema, escolha um plano abaixo e realize o pagamento. O acesso será liberado automaticamente 
              após a confirmação bancária.
            </AlertDescription>
          </Alert>
        )}

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
            <Rocket className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              {isSystemBlocked ? 'Assine agora para desbloquear' : 'Desbloqueie todo o potencial'}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Escolha o Plano Ideal para sua{" "}
            <span className="text-primary">Barbearia</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Gerencie agendamentos, clientes e finanças com as melhores ferramentas do mercado.
          </p>

          {/* Billing Period Selector */}
          <div className="inline-flex items-center p-1 bg-muted rounded-xl">
            <button
              onClick={() => setBillingPeriod('MONTHLY')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                billingPeriod === 'MONTHLY'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingPeriod('QUARTERLY')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                billingPeriod === 'QUARTERLY'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Trimestral
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                -10%
              </span>
            </button>
            <button
              onClick={() => setBillingPeriod('YEARLY')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                billingPeriod === 'YEARLY'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Anual
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Current Status */}
        {subscription && (
          <Card className="mb-8 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    Status Atual
                  </CardTitle>
                  <CardDescription>
                    {subscription.status === 'trial' && 'Período de teste'}
                    {subscription.status === 'active' && 'Assinatura ativa'}
                    {subscription.status === 'expired' && 'Assinatura expirada'}
                    {subscription.status === 'pending_payment' && 'Aguardando pagamento'}
                  </CardDescription>
                </div>
                <Badge 
                  variant={subscription.status === 'active' ? 'default' : 
                           subscription.status === 'trial' ? 'secondary' : 'destructive'}
                  className="text-sm px-4 py-1"
                >
                  {subscription.status === 'trial' && 'Trial'}
                  {subscription.status === 'active' && 'Ativo'}
                  {subscription.status === 'expired' && 'Expirado'}
                  {subscription.status === 'pending_payment' && 'Pendente'}
                </Badge>
              </div>
            </CardHeader>
            {subscription.asaas_payment_link && subscription.status === 'pending_payment' && (
              <CardContent>
                <Button 
                  onClick={() => window.open(subscription.asaas_payment_link, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Finalizar Pagamento
                </Button>
              </CardContent>
            )}
          </Card>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {isLoading || trialLoading ? (
            <div className="col-span-3 flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : plans && plans.length > 0 ? (
            plans.map((plan) => {
              const isPopular = plan.name === 'Profissional';
              const monthlyEquivalent = getMonthlyEquivalent(plan.price);
              
              return (
                <Card 
                  key={plan.id}
                  className={`relative flex flex-col transition-all duration-300 hover:shadow-xl ${
                    isPopular 
                      ? 'border-primary shadow-lg shadow-primary/10 scale-105 z-10' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-4 py-1">
                        Mais Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="min-h-[40px]">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-grow">
                    <div className="text-center mb-6">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-lg text-muted-foreground">R$</span>
                        <span className="text-5xl font-bold">
                          {formatPrice(plan.price)}
                        </span>
                      </div>
                      <span className="text-muted-foreground">{getPeriodLabel()}</span>
                      
                      {billingPeriod !== 'MONTHLY' && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-muted-foreground">
                            Equivale a <span className="font-semibold text-foreground">R$ {formatPrice(monthlyEquivalent)}</span>/mês
                          </p>
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                            {getDiscount()}% de desconto
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {getFeatureIcon(feature)}
                          </div>
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                      size="lg"
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isPlanLoading(plan.id)}
                    >
                      {isPlanLoading(plan.id) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        "Assinar Agora"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })
          ) : (
            <div className="col-span-3 text-center py-12">
              <p className="text-muted-foreground">
                Nenhum plano disponível no momento.
              </p>
            </div>
          )}
        </div>

        {/* Trust Section */}
        <div className="text-center max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold mb-4">Pagamento Seguro</h3>
          <p className="text-muted-foreground mb-4">
            Processado pelo ASAAS com suporte a PIX, cartão de crédito e boleto bancário.
            Sua assinatura é ativada automaticamente após a confirmação do pagamento.
          </p>
          <div className="flex justify-center gap-4 opacity-60">
            <Shield className="w-8 h-8" />
            <span className="text-sm self-center">Ambiente 100% seguro</span>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Finalizar Assinatura
            </DialogTitle>
            <DialogDescription>
              Você será redirecionado para a página de pagamento segura do ASAAS.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">Pague com PIX, Cartão ou Boleto</p>
                <p className="text-sm text-muted-foreground">
                  Ativação automática após confirmação
                </p>
              </div>
            </div>
            
            <Button onClick={handleOpenCheckout} className="w-full gap-2">
              <ExternalLink className="w-4 h-4" />
              Ir para Pagamento
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setShowPaymentDialog(false)} 
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default PlatformPlans;
