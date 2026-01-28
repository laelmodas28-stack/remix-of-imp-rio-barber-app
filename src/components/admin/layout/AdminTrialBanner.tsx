import { Clock, Crown, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { useNavigate, useParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

export const AdminTrialBanner = () => {
  const { barbershop } = useBarbershopContext();
  const { isInTrial, daysRemaining, isLoading, hasActiveSubscription, subscription } = useTrialStatus(barbershop?.id);
  const navigate = useNavigate();
  const params = useParams<{ slug?: string }>();

  // Don't show if loading, has active paid subscription, or not in trial
  if (isLoading) {
    return null;
  }

  // Show different states based on subscription status
  const isPendingPayment = subscription?.status === 'pending_payment';
  const isExpired = subscription?.status === 'expired' || (!hasActiveSubscription && !isInTrial && subscription);

  // Calculate trial progress (assuming 7 day trial)
  const totalTrialDays = 7;
  const progressPercent = isInTrial ? ((totalTrialDays - daysRemaining) / totalTrialDays) * 100 : 100;

  const handleUpgradeClick = () => {
    if (params.slug) {
      navigate(`/b/${params.slug}/plans`);
    }
  };

  const handleContinuePayment = () => {
    if (subscription?.asaas_payment_link) {
      window.open(subscription.asaas_payment_link, '_blank');
    }
  };

  // Don't show banner if has active paid subscription
  if (hasActiveSubscription && !isInTrial && !isPendingPayment) {
    return null;
  }

  // Expired state
  if (isExpired) {
    return (
      <div className="bg-gradient-to-r from-destructive/20 via-destructive/10 to-destructive/5 border-b border-destructive/30">
        <div className="px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-destructive">Período de teste encerrado</p>
              <p className="text-sm text-muted-foreground">
                Assine um plano para continuar usando todas as funcionalidades
              </p>
            </div>
          </div>
          <Button onClick={handleUpgradeClick} variant="destructive" className="gap-2">
            <Crown className="w-4 h-4" />
            Assinar Agora
          </Button>
        </div>
      </div>
    );
  }

  // Pending payment state
  if (isPendingPayment) {
    return (
      <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/5 border-b border-amber-500/30">
        <div className="px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-600">Pagamento pendente</p>
              <p className="text-sm text-muted-foreground">
                Finalize o pagamento para ativar sua assinatura
              </p>
            </div>
          </div>
          <Button onClick={handleContinuePayment} className="gap-2 bg-amber-600 hover:bg-amber-700">
            <Rocket className="w-4 h-4" />
            Finalizar Pagamento
          </Button>
        </div>
      </div>
    );
  }

  // Trial state
  if (isInTrial) {
    const isUrgent = daysRemaining <= 2;
    
    return (
      <div className={`border-b ${
        isUrgent 
          ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/30' 
          : 'bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30'
      }`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isUrgent ? 'bg-amber-500/20' : 'bg-primary/20'
              }`}>
                <Clock className={`w-5 h-5 ${isUrgent ? 'text-amber-600' : 'text-primary'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-semibold ${isUrgent ? 'text-amber-600' : 'text-primary'}`}>
                    Trial por {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
                  </p>
                  {isUrgent && (
                    <span className="text-xs bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                      Expira em breve!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <Progress 
                    value={progressPercent} 
                    className={`h-1.5 flex-1 max-w-xs ${isUrgent ? '[&>div]:bg-amber-500' : ''}`}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {daysRemaining} de {totalTrialDays} dias restantes
                  </span>
                </div>
              </div>
            </div>
            <Button 
              onClick={handleUpgradeClick} 
              variant={isUrgent ? "default" : "outline"}
              className={`gap-2 flex-shrink-0 ${isUrgent ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
            >
              <Crown className="w-4 h-4" />
              Fazer Upgrade
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AdminTrialBanner;
