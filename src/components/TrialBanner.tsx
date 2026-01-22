import { Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";

const SUPPORT_WHATSAPP = "5511969332465";

export const TrialBanner = () => {
  const { barbershop } = useBarbershopContext();
  const { isInTrial, daysRemaining, isLoading, hasActiveSubscription } = useTrialStatus(barbershop?.id);

  if (isLoading || hasActiveSubscription || !isInTrial) {
    return null;
  }

  const handleSubscribeClick = () => {
    const message = encodeURIComponent(
      `Olá! Gostaria de assinar um plano para a barbearia ${barbershop?.name || ""}. Meu período de teste está acabando.`
    );
    window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${message}`, "_blank");
  };

  return (
    <div className="bg-gradient-to-r from-primary/20 to-primary/10 border-b border-primary/30">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-primary" />
          <span>
            <strong className="text-primary">{daysRemaining}</strong>{" "}
            {daysRemaining === 1 ? "dia restante" : "dias restantes"} do período de teste
          </span>
        </div>
        <Button
          size="sm"
          variant="default"
          onClick={handleSubscribeClick}
          className="flex items-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Assinar Plano</span>
        </Button>
      </div>
    </div>
  );
};

export default TrialBanner;
