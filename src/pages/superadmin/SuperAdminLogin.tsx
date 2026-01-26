import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Loader2, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

export function SuperAdminLogin() {
  const navigate = useNavigate();
  const { user, signIn, loading: authLoading } = useAuth();
  const { isSuperAdmin, isLoading: superAdminLoading } = useSuperAdmin();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Change credentials state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  // Redirect if already logged in as super admin
  useEffect(() => {
    if (!authLoading && !superAdminLoading && user && isSuperAdmin) {
      navigate("/superadmin");
    }
  }, [user, isSuperAdmin, authLoading, superAdminLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast.error("Credenciais inválidas");
        return;
      }

      // The redirect will happen via useEffect after role check
    } catch (error) {
      toast.error("Erro ao fazer login");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail) {
      toast.error("Informe o novo email");
      return;
    }

    setIsChanging(true);

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      
      if (error) {
        toast.error(error.message || "Erro ao alterar email");
        return;
      }

      toast.success("Email alterado! Verifique sua caixa de entrada para confirmar.");
      setNewEmail("");
    } catch (error) {
      toast.error("Erro ao alterar email");
    } finally {
      setIsChanging(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsChanging(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        toast.error(error.message || "Erro ao alterar senha");
        return;
      }

      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error("Erro ao alterar senha");
    } finally {
      setIsChanging(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Super Admin</CardTitle>
          <CardDescription>
            Acesso restrito aos administradores da plataforma ImperioApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="settings" disabled={!user}>Alterar Acesso</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@imperioapp.com"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-6">
              {/* Change Email */}
              <form onSubmit={handleChangeEmail} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  Alterar Email
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newEmail">Novo Email</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="novo@email.com"
                    disabled={isChanging}
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full" disabled={isChanging}>
                  {isChanging ? <Loader2 className="w-4 h-4 animate-spin" /> : "Alterar Email"}
                </Button>
              </form>

              <div className="border-t" />

              {/* Change Password */}
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  Alterar Senha
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isChanging}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isChanging}
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full" disabled={isChanging}>
                  {isChanging ? <Loader2 className="w-4 h-4 animate-spin" /> : "Alterar Senha"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default SuperAdminLogin;
