import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";

export const BusinessHours = () => {
  const { barbershop } = useBarbershopContext();

  const formatTime = (time: string | null | undefined) => {
    if (!time) return "";
    return time.substring(0, 5);
  };

  // Use opening_time/closing_time and opening_days from barbershop
  const openTime = barbershop?.opening_time;
  const closeTime = barbershop?.closing_time;
  const days = barbershop?.opening_days;

  return (
    <Card className="p-6 border-border">
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold mb-2">Horário de Atendimento</h3>
          <p className="text-sm text-muted-foreground mb-2">
            {openTime && closeTime 
              ? `${formatTime(openTime)} - ${formatTime(closeTime)}`
              : '09:00 - 19:00'
            }
          </p>
          <p className="text-sm text-muted-foreground">
            {days && days.length > 0
              ? days.join(", ")
              : 'Segunda a Sábado'
            }
          </p>
        </div>
      </div>
    </Card>
  );
};
