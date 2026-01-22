import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBarbershop } from "@/contexts/BarbershopContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown } from "lucide-react";
import BarbershopLoader from "@/components/BarbershopLoader";

// Skeleton apenas para o formulário (mantém logo e nome visíveis)
const FormSkeleton = () => <>
    {/* Tabs skeleton */}
    <Skeleton className="h-10 w-full mb-4 rounded-lg" />

    {/* Form skeleton */}
    <Card className="border-border">
      <CardHeader>
        <Skeleton className="h-7 w-24 mb-2" />
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
      </CardContent>
    </Card>
  </>;
const BarbershopAuth = () => {
  const {
    signIn,
    signUp,
    user,
    loading
  } = useAuth();
  const {
    barbershop,
    isLoading: barbershopLoading,
    baseUrl
  } = useBarbershop();
  const {
    slug
  } = useParams<{
    slug: string;
  }>();
  const navigate = useNavigate();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");

  // Store origin barbershop em localStorage (persiste) e sessionStorage (imediato)
  useEffect(() => {
    if (slug) {
      localStorage.setItem("origin_barbershop_slug", slug);
      sessionStorage.setItem("origin_barbershop_slug", slug);
    }
  }, [slug]);

  // Redirect if already logged in - back to the barbershop
  useEffect(() => {
    if (user && !loading) {
      navigate(baseUrl || `/b/${slug}`);
    }
  }, [user, loading, navigate, baseUrl, slug]);

  // Se usuário logado, mostrar loader bonito enquanto redireciona
  if (user && !loading) {
    return <BarbershopLoader logoUrl={barbershop?.logo_url} name={barbershop?.name} message="Entrando..." />;
  }
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      error
    } = await signIn(loginEmail, loginPassword);

    // Redirect IMEDIATO após login bem-sucedido
    if (!error) {
      navigate(baseUrl || `/b/${slug}`, {
        replace: true
      });
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      error
    } = await signUp(signupEmail, signupPassword, signupFullName, signupPhone);

    // Redirect IMEDIATO após signup bem-sucedido
    if (!error) {
      navigate(baseUrl || `/b/${slug}`, {
        replace: true
      });
    }
  };

  // Mostrar loading apenas se autenticação está carregando (sem barbershop ainda)
  const showFormSkeleton = loading || barbershopLoading;
  return <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header com logo e nome - sempre visível */}
        <div className="text-center mb-8">
          {barbershop?.logo_url ? <img src={barbershop.logo_url} alt={barbershop.name} className="w-32 h-32 mx-auto mb-4 object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.4)]" /> : <div className="w-32 h-32 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
              <Crown className="w-16 h-16 text-primary" />
            </div>}
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            
            {barbershop?.name || "Carregando..."}
          </h1>
        </div>

        {/* Formulário ou Skeleton */}
        {showFormSkeleton ? <FormSkeleton /> : <Tabs defaultValue="login" className="w-full">
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
                    <Input id="login-email" type="email" placeholder="seu@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
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
                    <Input id="signup-name" type="text" placeholder="Seu nome" value={signupFullName} onChange={e => setSignupFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Telefone</Label>
                    <Input id="signup-phone" type="tel" placeholder="(00) 00000-0000" value={signupPhone} onChange={e => setSignupPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="seu@email.com" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input id="signup-password" type="password" placeholder="••••••••" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" variant="premium" className="w-full" size="lg">
                    Criar Conta
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>}
      </div>
    </div>;
};
export default BarbershopAuth;