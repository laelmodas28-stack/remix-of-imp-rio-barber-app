import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Crown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BarbershopLoader from "@/components/BarbershopLoader";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Ler slug de origem (localStorage para persistência, sessionStorage como fallback)
  const originSlug = localStorage.getItem("origin_barbershop_slug") || sessionStorage.getItem("origin_barbershop_slug");

  // Buscar barbearia oficial (is_official = true)
  const { data: officialBarbershop, isLoading: officialLoading } = useQuery({
    queryKey: ["official-barbershop"],
    queryFn: async () => {
      const { data } = await supabase
        .from("barbershops")
        .select("slug, name, logo_url")
        .eq("is_official", true)
        .maybeSingle();
      return data;
    },
  });

  // Buscar dados da barbearia de origem para o loader
  const { data: originBarbershop } = useQuery({
    queryKey: ["origin-barbershop-loader", originSlug],
    queryFn: async () => {
      if (!originSlug) return null;
      const { data } = await supabase
        .from("barbershops")
        .select("name, logo_url")
        .eq("slug", originSlug)
        .maybeSingle();
      return data;
    },
    enabled: !!originSlug,
  });

  // PRIORIDADE 1: Redirecionar para barbearia oficial se existir
  useEffect(() => {
    if (!officialLoading && officialBarbershop?.slug) {
      navigate(`/b/${officialBarbershop.slug}`, { replace: true });
    }
  }, [officialLoading, officialBarbershop, navigate]);

  // PRIORIDADE 2: Redirecionamento se usuário logado veio de uma barbearia
  useEffect(() => {
    if (!authLoading && !officialLoading && !officialBarbershop && user && originSlug) {
      navigate(`/b/${originSlug}`, { replace: true });
    }
  }, [authLoading, officialLoading, officialBarbershop, user, originSlug, navigate]);

  // Buscar barbearia do usuário (se for admin)
  const { data: userBarbershop, isLoading: barbershopLoading } = useQuery({
    queryKey: ["user-barbershop", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Verificar se é admin de alguma barbearia
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("barbershop_id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .not("barbershop_id", "is", null)
        .maybeSingle();

      if (userRole?.barbershop_id) {
        const { data: barbershop } = await supabase
          .from("barbershops")
          .select("slug")
          .eq("id", userRole.barbershop_id)
          .maybeSingle();
        
        return barbershop;
      }

      return null;
    },
    enabled: !!user,
  });

  // Redirecionar: admin para sua barbearia
  // Cliente com originSlug já é tratado no useEffect acima
  useEffect(() => {
    if (!authLoading && !barbershopLoading && !originSlug) {
      if (userBarbershop?.slug) {
        navigate(`/b/${userBarbershop.slug}`, { replace: true });
      }
    }
  }, [authLoading, barbershopLoading, userBarbershop, navigate, originSlug]);

  const handleBackToBarbershop = () => {
    if (originSlug) {
      navigate(`/b/${originSlug}`);
    }
  };

  // BLOQUEIO: Se há barbearia oficial, sempre mostra loader enquanto redireciona
  if (officialLoading || officialBarbershop) {
    return (
      <BarbershopLoader 
        logoUrl={officialBarbershop?.logo_url} 
        name={officialBarbershop?.name} 
        message="Carregando..."
      />
    );
  }

  // BLOQUEIO: Se usuário logado com originSlug, mostra loader
  if (user && originSlug) {
    return (
      <BarbershopLoader 
        logoUrl={originBarbershop?.logo_url} 
        name={originBarbershop?.name} 
        message="Entrando..."
      />
    );
  }

  // Loading state durante verificação de auth ou busca de barbearia do admin
  if (authLoading) {
    return (
      <BarbershopLoader message="Carregando..." />
    );
  }

  // Se usuário está logado e é admin, esperar carregar dados da barbearia
  if (user && barbershopLoading) {
    return (
      <BarbershopLoader message="Carregando sua barbearia..." />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Botão Voltar se houver origem */}
        {originSlug && (
          <Button 
            variant="ghost" 
            onClick={handleBackToBarbershop}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Barbearia
          </Button>
        )}

        <Crown className="w-16 h-16 mx-auto mb-6 text-primary" />
        <h1 className="text-4xl font-bold mb-4">Sistema de Barbearias</h1>
        <p className="text-muted-foreground mb-8">
          Gerencie sua barbearia ou acesse como cliente
        </p>

        <div className="space-y-4">
          {!user ? (
            <>
              <Button 
                variant="premium" 
                size="lg" 
                className="w-full"
                onClick={() => navigate("/auth")}
              >
                Entrar
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full"
                onClick={() => navigate("/registro-barbeiro")}
              >
                Cadastrar Barbearia
              </Button>
            </>
          ) : (
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Olá!</CardTitle>
                <CardDescription>
                  Você está logado, mas não tem uma barbearia associada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="premium" 
                  className="w-full"
                  onClick={() => navigate("/registro-barbeiro")}
                >
                  Criar Minha Barbearia
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/account")}
                >
                  Minha Conta
                </Button>
                {originSlug && (
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={handleBackToBarbershop}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para Barbearia
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;