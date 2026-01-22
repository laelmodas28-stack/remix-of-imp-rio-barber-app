import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useBarbershop } from "@/hooks/useBarbershop";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Crown, Calendar, Award, Scissors, Loader2, CreditCard, QrCode } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Subscriptions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { barbershop } = useBarbershop();
  const { plans, plansLoading, clientSubscriptions, activeSubscription, refetchSubscriptions } = useSubscriptions(barbershop?.id);
  
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Handle payment callback from URL
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast.success('Pagamento processado! Sua assinatura será ativada em instantes.');
      refetchSubscriptions();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentStatus === 'failure') {
      toast.error('Pagamento não aprovado. Tente novamente.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentStatus === 'pending') {
      toast.info('Pagamento pendente. Aguarde a confirmação.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, refetchSubscriptions]);

  // Buscar todos os serviços disponíveis
  const { data: services } = useQuery({
    queryKey: ["services-subscriptions", barbershop?.id],
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

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error("Faça login para assinar um plano");
      navigate("/auth");
      return;
    }

    if (!barbershop) {
      toast.error("Barbearia não encontrada");
      return;
    }

    if (activeSubscription) {
      toast.error("Você já possui uma assinatura ativa");
      return;
    }

    setSelectedPlanId(planId);
    setIsCheckoutLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-mercadopago-checkout', {
        body: {
          planId,
          barbershopId: barbershop.id,
        },
      });

      if (error) {
        console.error('Checkout error:', error);
        if (error.message?.includes('MP_NOT_CONFIGURED')) {
          toast.error('Sistema de pagamento não configurado. Entre em contato com a barbearia.');
        } else {
          toast.error('Erro ao criar checkout. Tente novamente.');
        }
        return;
      }

      if (data?.initPoint) {
        setCheckoutUrl(data.initPoint);
        setShowPaymentDialog(true);
      } else {
        toast.error('Erro ao obter link de pagamento');
      }
    } catch (error) {
      console.error("Erro ao criar checkout:", error);
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setIsCheckoutLoading(false);
      setSelectedPlanId(null);
    }
  };

  const handleOpenCheckout = () => {
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
      setShowPaymentDialog(false);
      setCheckoutUrl(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Crown className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
          <h1 className="text-4xl font-bold mb-2">Planos de Assinatura</h1>
          <p className="text-muted-foreground">
            Economize com nossos planos mensais
          </p>
        </div>

        {/* Assinatura Ativa */}
        {activeSubscription && (
          <Card className="border-primary mb-8 bg-gradient-to-br from-primary/10 to-transparent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Sua Assinatura Ativa
                  </CardTitle>
                  <CardDescription>
                    {activeSubscription.plan?.name}
                  </CardDescription>
                </div>
                <Badge variant="default" className="text-lg px-4 py-2">
                  Ativo
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Mensal</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {activeSubscription.plan?.price}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Válido até</p>
                  <p className="text-lg font-semibold">
                    {format(new Date(activeSubscription.end_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Serviços Disponíveis */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">Serviços Disponíveis</h2>
          <p className="text-center text-muted-foreground mb-8">
            Todos os serviços que você pode utilizar com nossas assinaturas
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {services?.map((service) => (
              <Card key={service.id} className="border-border hover:shadow-gold transition-all">
                <CardHeader>
                  <Scissors className="w-8 h-8 text-primary mb-2" />
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-primary">
                      R$ {service.price.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {service.duration_minutes} min
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Planos Disponíveis */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">Planos de Assinatura</h2>
          <p className="text-center text-muted-foreground mb-8">
            Escolha o plano ideal para você e economize
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plansLoading ? (
              <p className="col-span-3 text-center text-muted-foreground">Carregando planos...</p>
            ) : plans && plans.length > 0 ? (
              plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`border-border hover:shadow-gold transition-all ${
                    activeSubscription?.plan_id === plan.id ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="pt-4">
                      <span className="text-4xl font-bold text-primary">
                        R$ {plan.price}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="font-semibold flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        Benefícios:
                      </p>
                      <ul className="space-y-1 ml-6">
                        {plan.services_included && plan.services_included.length > 0 ? (
                          plan.services_included.map((service, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground">
                              • {service}
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-muted-foreground">• Acesso aos serviços</li>
                        )}
                      </ul>
                    </div>

                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Duração: {plan.duration_days} dias
                    </p>

                    <Button 
                      variant={activeSubscription?.plan_id === plan.id ? "outline" : "default"}
                      className="w-full"
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={!!activeSubscription || (isCheckoutLoading && selectedPlanId === plan.id)}
                    >
                      {isCheckoutLoading && selectedPlanId === plan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : activeSubscription?.plan_id === plan.id ? (
                        "Plano Atual"
                      ) : activeSubscription ? (
                        "Já possui assinatura"
                      ) : (
                        "Assinar Agora"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Nenhum plano disponível no momento
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Histórico de Assinaturas */}
        {clientSubscriptions && clientSubscriptions.length > 0 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Histórico de Assinaturas</CardTitle>
              <CardDescription>Suas assinaturas anteriores e atuais</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientSubscriptions.map((subscription) => (
                  <div 
                    key={subscription.id}
                    className="flex justify-between items-center p-4 bg-card/30 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">{subscription.plan?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(subscription.start_date), "dd/MM/yyyy")} - {format(new Date(subscription.end_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        subscription.status === 'active' ? 'default' :
                        subscription.status === 'expired' ? 'secondary' : 'destructive'
                      }>
                        {subscription.status === 'active' ? 'Ativo' :
                         subscription.status === 'expired' ? 'Expirado' : 'Cancelado'}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        R$ {subscription.plan?.price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Finalizar Pagamento
            </DialogTitle>
            <DialogDescription>
              Você será redirecionado para o Mercado Pago para completar o pagamento de forma segura.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <QrCode className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">Pague com Pix, cartão ou boleto</p>
                <p className="text-sm text-muted-foreground">Ambiente seguro do Mercado Pago</p>
              </div>
            </div>
            <Button onClick={handleOpenCheckout} className="w-full">
              Ir para o Pagamento
            </Button>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="w-full">
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Subscriptions;
