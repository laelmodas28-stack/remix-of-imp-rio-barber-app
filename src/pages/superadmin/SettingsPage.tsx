import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";

export function SettingsPage() {
  const { user } = useAuth();
  
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail) {
      toast.error("Informe o novo email");
      return;
    }

    setIsChangingEmail(true);

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
      setIsChangingEmail(false);
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

    setIsChangingPassword(true);

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
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Altere suas credenciais de acesso</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conta Atual</CardTitle>
            <CardDescription>Informações da sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Email atual:</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Change Email */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Alterar Email</CardTitle>
            </div>
            <CardDescription>Um email de confirmação será enviado</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newEmail">Novo Email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="novo@email.com"
                  disabled={isChangingEmail}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isChangingEmail}>
                {isChangingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  "Alterar Email"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="md:col-span-2 max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Alterar Senha</CardTitle>
            </div>
            <CardDescription>A nova senha deve ter pelo menos 6 caracteres</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isChangingPassword}
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
                  disabled={isChangingPassword}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  "Alterar Senha"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SettingsPage;
