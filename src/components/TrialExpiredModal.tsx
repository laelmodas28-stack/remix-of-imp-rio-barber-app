import { Lock, Crown, LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const TrialExpiredModal = () => {
  const { user } = useAuth();
  const { barbershop } = useBarbershopContext();
  const { trialExpired, isLoading, hasActiveSubscription, subscription } = useTrialStatus(barbershop?.id);
  const navigate = useNavigate();
  const params = useParams<{ slug?: string }>();

  // Only show if user is logged in, trial expired, and no subscription
  const shouldShow = !!user && trialExpired && !hasActiveSubscription && !isLoading;

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
    <Dialog open={shouldShow}>
      <DialogContent 
        className="sm:max-w-md" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl flex items-center justify-center gap-2">
            <Crown className="w-6 h-6 text-primary" />
            Período de Teste Encerrado
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Seu período gratuito de 7 dias terminou. Para continuar utilizando 
            todos os recursos do sistema, assine um de nossos planos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">Com a assinatura você terá:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Agendamentos ilimitados</li>
              <li>✓ Gestão completa de clientes</li>
              <li>✓ Relatórios financeiros</li>
              <li>✓ Notificações por WhatsApp</li>
              <li>✓ Suporte prioritário</li>
            </ul>
          </div>

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
            Entrar com outra conta
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Pagamento seguro via PIX, cartão ou boleto.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrialExpiredModal;
