import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Crown, LogOut, User, ArrowLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "./NotificationBell";
import { VideoTutorials } from "./VideoTutorials";
import { ThemeToggle } from "./ThemeToggle";
import { TrialBanner } from "./TrialBanner";
import { TrialExpiredModal } from "./TrialExpiredModal";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
  const { user, signOut } = useAuth();
  const { barbershop: barbershopInfo, baseUrl } = useBarbershopContext();
  const location = useLocation();
  const params = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  // Verificar se estamos em uma rota /b/:slug usando o params diretamente
  const isInBarbershopRoute = !!params.slug && location.pathname.startsWith("/b/");

  // Verificar se o usuário é admin da barbearia atual
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id, barbershopInfo?.id],
    queryFn: async () => {
      if (!user || !barbershopInfo) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("barbershop_id", barbershopInfo.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!barbershopInfo?.id,
  });

  // Usar baseUrl para links se estiver em rota de barbearia
  const getLink = (path: string) => {
    if (isInBarbershopRoute && baseUrl) {
      return `${baseUrl}${path}`;
    }
    return path;
  };

  const homeLink = isInBarbershopRoute && baseUrl ? baseUrl : "/";
  
  // Auth link - save origin slug for redirect after login
  const getAuthLink = () => {
    if (isInBarbershopRoute && params.slug) {
      return `${baseUrl}/auth`;
    }
    return "/auth";
  };

  // Handle auth click to save origin (localStorage para persistência)
  const handleAuthClick = () => {
    if (isInBarbershopRoute && params.slug) {
      localStorage.setItem("origin_barbershop_slug", params.slug);
      sessionStorage.setItem("origin_barbershop_slug", params.slug);
    }
  };

  // Salvar contexto da barbearia antes de navegar para páginas globais
  const handleAccountClick = () => {
    if (isInBarbershopRoute && params.slug) {
      localStorage.setItem("origin_barbershop_slug", params.slug);
      sessionStorage.setItem("origin_barbershop_slug", params.slug);
    }
    navigate("/account");
  };

  const handleAdminClick = () => {
    if (isInBarbershopRoute && params.slug) {
      localStorage.setItem("origin_barbershop_slug", params.slug);
      sessionStorage.setItem("origin_barbershop_slug", params.slug);
      navigate(`/b/${params.slug}/admin`);
    } else {
      navigate("/admin");
    }
  };

  return (
    <>
      <TrialExpiredModal />
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <TrialBanner />
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to={homeLink} className="flex items-center gap-3 group">
          {barbershopInfo?.logo_url ? (
            <img 
              src={barbershopInfo.logo_url} 
              alt={barbershopInfo.name} 
              className="w-12 h-12 transition-transform group-hover:scale-110 object-contain"
            />
          ) : (
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
              <Crown className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold">
              {barbershopInfo?.name || "Barbearia"}
            </h1>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          {user ? (
            <>
              {/* Só mostrar botão Agendar se estiver em rota de barbearia */}
              {isInBarbershopRoute && (
                <Link to={getLink("/booking")}>
                  <Button variant="premium" size="lg">
                    Agendar
                  </Button>
                </Link>
              )}
              <VideoTutorials />
              <ThemeToggle />
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleAccountClick}>
                    Minha Conta
                  </DropdownMenuItem>
                  {/* Só mostrar Admin se o usuário for admin */}
                  {isAdmin && (
                    <DropdownMenuItem onClick={handleAdminClick}>
                      Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to={getAuthLink()} onClick={handleAuthClick}>
              <Button variant="premium" size="lg">
                Entrar
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
    </>
  );
};

export default Header;