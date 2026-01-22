import { useBarbershop } from "@/contexts/BarbershopContext";
import { useMetaTags } from "@/hooks/useMetaTags";

const BarbershopMetaTags = () => {
  const { barbershop, baseUrl } = useBarbershop();

  useMetaTags({
    title: barbershop?.name 
      ? `${barbershop.name} - Agende seu horário` 
      : "Agende seu horário - Barbearia",
    description: barbershop?.description 
      || `Agende seu horário na ${barbershop?.name || "nossa barbearia"}. Atendimento de excelência com os melhores profissionais.`,
    image: barbershop?.logo_url || undefined,
    url: typeof window !== "undefined" 
      ? `${window.location.origin}${baseUrl}` 
      : undefined,
    type: "business.business",
  });

  return null;
};

export default BarbershopMetaTags;
