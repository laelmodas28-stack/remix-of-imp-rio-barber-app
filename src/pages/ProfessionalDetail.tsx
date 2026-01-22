import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, User, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ProfessionalDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: professional, isLoading } = useQuery({
    queryKey: ["professional", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-64 w-full mb-8" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-4">Profissional não encontrado</h1>
          <Link to="/professionals">
            <Button>Ver Todos os Profissionais</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center">
              {professional.photo_url ? (
                <img 
                  src={professional.photo_url} 
                  alt={professional.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-16 h-16 text-primary-foreground" />
              )}
            </div>
            <CardTitle className="text-3xl mb-2">{professional.name}</CardTitle>
            <div className="flex items-center justify-center gap-1 text-primary mb-4">
              <Star className="w-5 h-5 fill-current" />
              <span className="text-xl font-semibold">{professional.rating}</span>
            </div>
            {professional.specialties && professional.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {professional.specialties.map((specialty, index) => (
                  <Badge key={index} variant="secondary">
                    {specialty}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {professional.bio && (
              <div>
                <h3 className="text-xl font-semibold mb-2">Sobre</h3>
                <p className="text-muted-foreground">{professional.bio}</p>
              </div>
            )}
            
            <div className="flex gap-4">
              <Link to="/booking" state={{ professionalId: professional.id }} className="flex-1">
                <Button variant="premium" size="lg" className="w-full">
                  <Calendar className="mr-2" />
                  Agendar com {professional.name.split(' ')[0]}
                </Button>
              </Link>
              <Link to="/professionals">
                <Button variant="outline" size="lg">
                  Ver Outros Profissionais
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default ProfessionalDetail;
