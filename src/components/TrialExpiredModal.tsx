import { Lock, Crown, LogOut, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const TrialExpiredModal = () => {
  const { user } = useAuth();
  const { barbershop } = useBarbershopContext();
  const { trialExpired, isLoading, hasActiveSubscription, subscription } = useTrialStatus(barbershop?.id);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ slug?: string }>();

  // Allow access to plans page even when expired
  const isOnPlansPage = location.pathname.includes('/plans');

  // Only show if user is logged in, trial expired, no subscription, and NOT on plans page
  const shouldShow = !!user && trialExpired && !hasActiveSubscription && !isLoading && !isOnPlansPage;

  const handleSubscribeClick = () => {
    if (params.slug) {
      navigate(`/b/${params.slug}/plans`);
    }
  };

  const handleContinuePayment = () => {
    if (subscription?.asaas_payment_link) {
      window.open(subscription.asaas_payment_link, '_blank');
    }
  };

  const handleLogoutAndRedirect = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!shouldShow) {
    return null;
  }

  const hasPendingPayment = subscription?.status === 'pending_payment' && subscription?.asaas_payment_link;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <div>
            <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Lock className="w-6 h-6 text-destructive" />
              Sistema Bloqueado
            </h2>
            <p className="text-muted-foreground mt-2">
              Seu período de teste de 7 dias terminou.
            </p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm text-center">Para continuar usando o sistema:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">✓ Escolha um plano adequado ao seu negócio</li>
            <li className="flex items-center gap-2">✓ Realize o pagamento via PIX, cartão ou boleto</li>
            <li className="flex items-center gap-2">✓ Após confirmação bancária, o sistema será liberado</li>
          </ul>
        </div>

        <div className="space-y-3">
          {hasPendingPayment ? (
            <Button
              onClick={handleContinuePayment}
              className="w-full flex items-center justify-center gap-2"
              size="lg"
            >
              <ExternalLink className="w-5 h-5" />
              Continuar Pagamento Pendente
            </Button>
          ) : (
            <Button
              onClick={handleSubscribeClick}
              className="w-full flex items-center justify-center gap-2"
              size="lg"
            >
              <Crown className="w-5 h-5" />
              Ver Planos e Assinar
            </Button>
          )}

          <Button
            onClick={handleLogoutAndRedirect}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            size="sm"
          >
            <LogOut className="w-4 h-4" />
            Sair e usar outra conta
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          O sistema será liberado automaticamente após a confirmação do pagamento pelo banco.
        </p>
      </div>
    </div>
  );
};

export default TrialExpiredModal;
