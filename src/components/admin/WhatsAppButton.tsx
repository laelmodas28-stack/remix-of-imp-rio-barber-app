import { FaWhatsapp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatBrazilianWhatsApp } from "@/lib/utils";

interface WhatsAppButtonProps {
  phone: string | null | undefined;
  clientName?: string;
  compact?: boolean;
}

export const WhatsAppButton = ({ phone, clientName, compact = true }: WhatsAppButtonProps) => {
  if (!phone) return null;

  const formattedPhone = formatBrazilianWhatsApp(phone);
  const whatsappUrl = `https://wa.me/${formattedPhone}`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(whatsappUrl, "_blank");
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
              onClick={handleClick}
            >
              <FaWhatsapp className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Enviar mensagem no WhatsApp{clientName ? ` para ${clientName}` : ""}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-green-500 border-green-500/30 hover:bg-green-500/10"
      onClick={handleClick}
    >
      <FaWhatsapp className="h-4 w-4 mr-2" />
      WhatsApp
    </Button>
  );
};
