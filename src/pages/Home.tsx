import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Crown, Scissors, Star, Users, User, Edit, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

import { BusinessHours } from "@/components/BusinessHours";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Home = () => {
  // 1. TODOS os hooks primeiro - OBRIGATÓRIO (Rules of Hooks)
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const { barbershop, baseUrl, isLoading: isBarbershopLoading } = useBarbershopContext();
  const location = useLocation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // 2. Queries ANTES de qualquer return condicional
  const { data: services } = useQuery({
    queryKey: ["services-home", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true)
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id,
  });

  const { data: professionals } = useQuery({
    queryKey: ["professionals-home", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true)
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id,
  });

  // 3. NÃO bloquear a renderização - permitir valores padrão

  // 4. Funções auxiliares
  const isInBarbershopRoute = location.pathname.startsWith("/b/");
  
  const getLink = (path: string) => {
    if (isInBarbershopRoute && baseUrl) {
      return `${baseUrl}${path}`;
    }
    return path;
  };

  const handleOpenEditDialog = () => {
    if (barbershop) {
      setEditName(barbershop.name);
      setEditDescription(barbershop.description || "");
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveChanges = async () => {
    if (!barbershop?.id) return;

    try {
      const { error } = await supabase
        .from("barbershops")
        .update({
          name: editName,
          description: editDescription,
        })
        .eq("id", barbershop.id);

      if (error) throw error;

      toast.success("Informações atualizadas com sucesso!");
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["barbershop"] });
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar informações");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden min-h-[400px]">
        {/* Cover Image Background */}
        {barbershop?.cover_url ? (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${barbershop.cover_url})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        )}
        <div className="container mx-auto text-center relative z-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <h1 className="text-5xl md:text-6xl font-bold">
              Bem-vindo ao <span className="text-primary">{barbershop?.name || "Barbearia"}</span>
            </h1>
            {isAdmin && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleOpenEditDialog}
                className="opacity-70 hover:opacity-100"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {barbershop?.description || "Barbearia premium com atendimento de excelência. Agende seu horário com os melhores profissionais."}
          </p>
          <Link to={getLink("/booking")}>
            <Button variant="premium" size="xl" className="shadow-elevation">
              <Calendar className="mr-2" />
              Agendar Agora
            </Button>
          </Link>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 px-4 bg-card/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to={getLink("/booking")}>
              <Card className="hover:shadow-gold transition-all cursor-pointer h-full border-border">
                <CardHeader>
                  <Calendar className="w-12 h-12 text-primary mb-4" />
                  <CardTitle>Agendar Corte</CardTitle>
                  <CardDescription>Reserve seu horário</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link to={getLink("/professionals")}>
              <Card className="hover:shadow-gold transition-all cursor-pointer h-full border-border">
                <CardHeader>
                  <Users className="w-12 h-12 text-primary mb-4" />
                  <CardTitle>Profissionais</CardTitle>
                  <CardDescription>Conheça nossa equipe</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link to={getLink("/services")}>
              <Card className="hover:shadow-gold transition-all cursor-pointer h-full border-border">
                <CardHeader>
                  <Scissors className="w-12 h-12 text-primary mb-4" />
                  <CardTitle>Serviços</CardTitle>
                  <CardDescription>Veja o que oferecemos</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Serviços em Destaque
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services?.map((service) => (
              <Card key={service.id} className="border-border hover:shadow-gold transition-all">
                <CardHeader>
                  <Scissors className="w-8 h-8 text-primary mb-2" />
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-primary">
                      R$ {service.price.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {service.duration_minutes} min
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Top Professionals */}
      <section className="py-16 px-4 bg-card/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Profissionais Recomendados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {professionals?.map((professional) => (
              <Card key={professional.id} className="border-border hover:shadow-gold transition-all">
                <CardHeader className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center">
                    {professional.photo_url ? (
                      <img 
                        src={professional.photo_url} 
                        alt={professional.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-primary-foreground" />
                    )}
                  </div>
                  <CardTitle>{professional.name}</CardTitle>
                  <div className="flex items-center justify-center gap-1 text-primary">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-semibold">{professional.rating}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground mb-4">
                    {professional.bio || "Profissional especializado"}
                  </p>
                  <Link to={getLink(`/professionals/${professional.id}`)}>
                    <Button variant="imperial" className="w-full">
                      Ver Perfil
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Galeria Preview */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Nossos Trabalhos</h2>
            <p className="text-muted-foreground">
              Veja alguns dos resultados que entregamos aos nossos clientes
            </p>
          </div>
          <div className="text-center">
            <Link to={getLink("/gallery")}>
              <Button variant="premium" size="lg">
                Ver Galeria Completa
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Assinaturas e Horários */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link to={getLink("/subscriptions")}>
              <Card className="border-border hover:shadow-gold transition-all cursor-pointer h-full">
                <CardHeader>
                  <Crown className="w-12 h-12 text-primary mb-4" />
                  <CardTitle>Assinaturas</CardTitle>
                  <CardDescription>Conheça nossos planos e serviços mensais</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="premium" className="w-full">
                    Ver Planos e Serviços
                  </Button>
                </CardContent>
              </Card>
            </Link>
            
            <BusinessHours />
          </div>
        </div>
      </section>

      <Footer />

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Informações da Barbearia</DialogTitle>
            <DialogDescription>
              Atualize o nome e a mensagem de boas-vindas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Barbearia</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ex: Império Barber"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mensagem de Boas-Vindas</Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Ex: Barbearia premium com atendimento de excelência..."
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveChanges}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;
