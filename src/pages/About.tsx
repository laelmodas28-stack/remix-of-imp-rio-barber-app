import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import { SocialLinks } from "@/components/SocialLinks";
import { BusinessHours } from "@/components/BusinessHours";
import { Crown, MapPin, Phone } from "lucide-react";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";

const About = () => {
  const { barbershop: info } = useBarbershopContext();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Crown className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-bold mb-4">Sobre {info?.name || "a Barbearia"}</h1>
            <p className="text-muted-foreground text-lg">
              {info?.description || "Barbearia premium com atendimento de excelência"}
            </p>
          </div>

          {/* História */}
          <Card className="border-border mb-8">
            <CardHeader>
              <CardTitle>Nossa História</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground leading-relaxed">
              <p className="mb-4">
                {info?.name || "Nossa barbearia"} nasceu com o objetivo de proporcionar uma experiência única e premium 
                para homens que valorizam qualidade e estilo. Combinamos técnicas tradicionais de barbearia 
                com as tendências mais modernas do mercado.
              </p>
              <p>
                Nossa equipe é formada por profissionais altamente qualificados e apaixonados pelo que fazem, 
                garantindo que cada cliente saia do nosso estabelecimento com a melhor versão de si mesmo.
              </p>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Contato e Localização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {info?.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">Endereço</p>
                    <p className="text-muted-foreground">{info.address}</p>
                  </div>
                </div>
              )}

              {info?.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">Telefone</p>
                    <p className="text-muted-foreground">{info.phone}</p>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <p className="font-semibold mb-3">Siga-nos nas redes sociais</p>
                <SocialLinks 
                  whatsapp={info?.whatsapp}
                  instagram={info?.instagram}
                />
              </div>
            </CardContent>
          </Card>

          {/* Horários */}
          <div className="mt-8">
            <BusinessHours />
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
