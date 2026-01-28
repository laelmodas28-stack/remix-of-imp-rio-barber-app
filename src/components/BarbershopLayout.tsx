import { Outlet, useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarbershopProvider } from "@/contexts/BarbershopContext";
import { Loader2, RefreshCw } from "lucide-react";
import BarbershopMetaTags from "./BarbershopMetaTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const BarbershopLayout = () => {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const lastSlugRef = useRef<string | null>(null);

  // Salvar slug atual em localStorage para persistência
  useEffect(() => {
    if (slug) {
      localStorage.setItem("origin_barbershop_slug", slug);
      sessionStorage.setItem("origin_barbershop_slug", slug);
    }
  }, [slug]);

  // RESET completo quando o slug muda
  useEffect(() => {
    if (slug && slug !== lastSlugRef.current) {
      // Resetar queries para forçar busca fresca
      queryClient.resetQueries({ queryKey: ["barbershop-by-slug"] });
      queryClient.resetQueries({ queryKey: ["barbershop-exists"] });
      
      // Remover cache do slug anterior
      if (lastSlugRef.current) {
        queryClient.removeQueries({ queryKey: ["barbershop-exists", lastSlugRef.current] });
        queryClient.removeQueries({ queryKey: ["barbershop-by-slug", lastSlugRef.current] });
      }
      
      lastSlugRef.current = slug;
    }
  }, [slug, queryClient]);

  // Query para buscar barbearia por slug
  const { data: barbershop, isLoading, error, isError } = useQuery({
    queryKey: ["barbershop-exists", slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error: fetchError } = await supabase
        .from("barbershops")
        .select("id, slug, name")
        .eq("slug", slug)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      return data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes - prevent excessive refetching on refresh
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: true,
    retry: 3, // Retry 3 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Erro ou barbearia não encontrada
  if (error || !barbershop) {
    // Tentar recuperar o último slug válido
    const lastValidSlug = localStorage.getItem("origin_barbershop_slug");
    
    // Se o slug atual é diferente do último válido, tentar navegar para o último válido
    if (lastValidSlug && lastValidSlug !== slug) {
      navigate(`/b/${lastValidSlug}`, { replace: true });
      return null;
    }
    
    // Se não há slug válido ou é o mesmo, mostrar erro amigável
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-border">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Barbearia não encontrada</h2>
            <p className="text-muted-foreground mb-6">
              Não foi possível carregar os dados da barbearia.
            </p>
            <div className="space-y-2">
              <Button 
                variant="premium" 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate("/registro-barbeiro")}
                className="w-full"
              >
                Cadastrar Barbearia
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <BarbershopProvider slug={slug}>
      <BarbershopMetaTags />
      <Outlet />
    </BarbershopProvider>
  );
};

export default BarbershopLayout;
