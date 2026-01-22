import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, User, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";

const Professionals = () => {
  const { barbershop, isLoading: isBarbershopLoading } = useBarbershopContext();

  const { data: professionals, isLoading } = useQuery({
    queryKey: ["professionals", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true)
        .order("rating", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Nossos Profissionais</h1>
          <p className="text-muted-foreground text-lg">
            Conheça nossa equipe de barbeiros especializados
          </p>
          {barbershop && (
            <p className="text-sm text-muted-foreground mt-2">
              Mostrando profissionais de: <span className="font-semibold text-primary">{barbershop.name}</span>
            </p>
          )}
        </div>

        {isBarbershopLoading || isLoading || !barbershop ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {professionals?.map((professional) => (
              <Card key={professional.id} className="border-border hover:shadow-gold transition-all">
                <CardHeader className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center shadow-gold">
                    {professional.photo_url ? (
                      <img 
                        src={professional.photo_url} 
                        alt={professional.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-16 h-16 text-primary-foreground" />
                    )}
                  </div>
                  <CardTitle className="text-xl">{professional.name}</CardTitle>
                  <div className="flex items-center justify-center gap-1 text-primary">
                    <Star className="w-5 h-5 fill-current" />
                    <span className="font-bold text-lg">{professional.rating}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {professional.specialties && professional.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {professional.specialties.map((specialty, idx) => (
                        <Badge key={idx} variant="secondary">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-center text-muted-foreground">
                    {professional.bio || "Profissional especializado com anos de experiência"}
                  </p>
                  <Link to="/booking" state={{ selectedProfessional: professional }}>
                    <Button variant="imperial" className="w-full">
                      Agendar com {professional.name.split(' ')[0]}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Professionals;
