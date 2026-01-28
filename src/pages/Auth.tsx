import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Crown, ArrowLeft, Store, ChevronRight } from "lucide-react";
import BarbershopLoader from "@/components/BarbershopLoader";
import { toast } from "sonner";

interface BarbershopOption {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  isAdmin?: boolean;
}

const Auth = () => {
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showBarbershopSelector, setShowBarbershopSelector] = useState(false);
  const [availableBarbershops, setAvailableBarbershops] = useState<BarbershopOption[]>([]);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");

  // Check if user came from a barbershop route
  const originSlug = localStorage.getItem("origin_barbershop_slug") || sessionStorage.getItem("origin_barbershop_slug");

  // Fetch barbershop info if we have an origin slug
  const { data: originBarbershop } = useQuery({
    queryKey: ["auth-origin-barbershop", originSlug],
    queryFn: async () => {
      if (!originSlug) return null;
      const { data } = await supabase
        .from("barbershops")
        .select("name, logo_url, slug")
        .eq("slug", originSlug)
        .maybeSingle();
      return data;
    },
    enabled: !!originSlug,
  });

  // Function to check if user is super_admin
  const checkSuperAdmin = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();
    return !!data;
  };

  // Function to find user's barbershops
  const findUserBarbershops = async (userId: string): Promise<BarbershopOption[]> => {
    const barbershops: BarbershopOption[] = [];
    const seenIds = new Set<string>();

    // Check user_roles for admin/barber roles
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("barbershop_id, role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin", "barber"]);

    if (userRoles && userRoles.length > 0) {
      for (const role of userRoles) {
        if (role.barbershop_id && !seenIds.has(role.barbershop_id)) {
          const { data: barbershop } = await supabase
            .from("barbershops")
            .select("id, slug, name, logo_url")
            .eq("id", role.barbershop_id)
            .single();

          if (barbershop) {
            seenIds.add(barbershop.id);
            barbershops.push({
              ...barbershop,
              isAdmin: role.role === "admin" || role.role === "super_admin"
            });
          }
        }
      }
    }

    // Check barbershop_clients for client associations
    const { data: clientAssociations } = await supabase
      .from("barbershop_clients")
      .select("barbershop_id")
      .eq("client_id", userId)
      .order("created_at", { ascending: false });

    if (clientAssociations && clientAssociations.length > 0) {
      for (const assoc of clientAssociations) {
        if (!seenIds.has(assoc.barbershop_id)) {
          const { data: barbershop } = await supabase
            .from("barbershops")
            .select("id, slug, name, logo_url")
            .eq("id", assoc.barbershop_id)
            .single();

          if (barbershop) {
            seenIds.add(barbershop.id);
            barbershops.push({
              ...barbershop,
              isAdmin: false
            });
          }
        }
      }
    }

    return barbershops;
  };

  // Function to handle redirection logic
  const handleUserRedirect = async (userId: string) => {
    setIsRedirecting(true);
    
    try {
      // If we have an origin slug, use it directly
      if (originSlug) {
        navigate(`/b/${originSlug}`, { replace: true });
        return;
      }

      // Check if user is super_admin first
      const isSuperAdmin = await checkSuperAdmin(userId);
      if (isSuperAdmin) {
        toast.success("Bem-vindo, Super Admin!");
        navigate("/superadmin", { replace: true });
        return;
      }

      const barbershops = await findUserBarbershops(userId);

      if (barbershops.length === 0) {
        // No barbershop association found
        toast.info("Acesse uma barbearia para agendar seus serviços");
        navigate("/", { replace: true });
        return;
      }

      if (barbershops.length === 1) {
        // Single barbershop - redirect directly
        const barbershop = barbershops[0];
        toast.success(`Bem-vindo de volta!`);
        if (barbershop.isAdmin) {
          navigate(`/b/${barbershop.slug}/admin`, { replace: true });
        } else {
          navigate(`/b/${barbershop.slug}`, { replace: true });
        }
        return;
      }

      // Multiple barbershops - show selector
      setAvailableBarbershops(barbershops);
      setShowBarbershopSelector(true);
      setIsRedirecting(false);
    } catch (error) {
      console.error("Error finding user barbershops:", error);
      navigate("/", { replace: true });
    }
  };

  // Handle barbershop selection
  const handleSelectBarbershop = (barbershop: BarbershopOption) => {
    setShowBarbershopSelector(false);
    toast.success(`Entrando em ${barbershop.name}`);
    if (barbershop.isAdmin) {
      navigate(`/b/${barbershop.slug}/admin`, { replace: true });
    } else {
      navigate(`/b/${barbershop.slug}`, { replace: true });
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && !isRedirecting && !showBarbershopSelector) {
      handleUserRedirect(user.id);
    }
  }, [user, loading]);

  // Show loading while checking auth
  if (loading || (isRedirecting && !showBarbershopSelector)) {
    return (
      <BarbershopLoader 
        logoUrl={originBarbershop?.logo_url} 
        name={originBarbershop?.name} 
        message={isRedirecting ? "Entrando..." : "Carregando..."}
      />
    );
  }

  // If user is logged in and no selector shown, show loader
  if (user && !showBarbershopSelector) {
    return (
      <BarbershopLoader 
        logoUrl={originBarbershop?.logo_url} 
        name={originBarbershop?.name} 
        message="Entrando..."
      />
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (!error) {
      const { data: { user: loggedInUser } } = await supabase.auth.getUser();
      if (loggedInUser) {
        await handleUserRedirect(loggedInUser.id);
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await signUp(signupEmail, signupPassword, signupFullName, signupPhone);
    
    if (!error) {
      if (originSlug) {
        navigate(`/b/${originSlug}`, { replace: true });
      } else {
        toast.success("Conta criada! Acesse uma barbearia para agendar.");
        navigate("/", { replace: true });
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail) {
      toast.error("Digite seu email");
      return;
    }

    setForgotPasswordLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast.error("Erro ao enviar email: " + error.message);
      } else {
        toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
        setShowForgotPassword(false);
        setForgotPasswordEmail("");
      }
    } catch (error) {
      toast.error("Erro ao processar solicitação");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Barbershop Selector Modal */}
      <Dialog open={showBarbershopSelector} onOpenChange={setShowBarbershopSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              Escolha sua Barbearia
            </DialogTitle>
            <DialogDescription>
              Você frequenta várias barbearias. Selecione qual deseja acessar:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {availableBarbershops.map((barbershop) => (
              <button
                key={barbershop.id}
                onClick={() => handleSelectBarbershop(barbershop)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all group"
              >
                {barbershop.logo_url ? (
                  <img 
                    src={barbershop.logo_url} 
                    alt={barbershop.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="font-medium">{barbershop.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {barbershop.isAdmin ? "Administrador" : "Cliente"}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Digite seu email para receber um link de recuperação de senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="seu@email.com"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForgotPassword(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={forgotPasswordLoading}
              >
                {forgotPasswordLoading ? "Enviando..." : "Enviar Email"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(originSlug ? `/b/${originSlug}` : "/")}
        className="absolute top-4 left-4 gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {originBarbershop?.logo_url ? (
            <img 
              src={originBarbershop.logo_url} 
              alt={originBarbershop.name} 
              className="w-32 h-32 mx-auto mb-4 object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.4)]"
            />
          ) : (
            <div className="w-32 h-32 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
              <Crown className="w-16 h-16 text-primary" />
            </div>
          )}
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Crown className="text-primary" />
            {originBarbershop?.name || "Imperio Barber"}
          </h1>
          {!originSlug && (
            <p className="text-muted-foreground text-sm mt-2">
              Entre com sua conta para acessar sua barbearia
            </p>
          )}
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Entre com sua conta</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Senha</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordEmail(loginEmail);
                          setShowForgotPassword(true);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" variant="premium" className="w-full" size="lg">
                    Entrar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Criar Conta</CardTitle>
                <CardDescription>Cadastre-se para agendar</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Telefone</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" variant="premium" className="w-full" size="lg">
                    Criar Conta
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            É barbeiro?
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/registro-barbeiro")}
            className="w-full"
          >
            <Crown className="w-4 h-4 mr-2" />
            Criar Barbearia
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
