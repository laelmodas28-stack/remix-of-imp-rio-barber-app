import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { useProfessionalLimit, getProfessionalLimitMessage } from "@/hooks/useProfessionalLimit";
import { useAuth } from "@/contexts/AuthContext";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Search, UserCog, User, UserPlus, Loader2, Trash2, Eye, EyeOff, Link, Crown, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Professional {
  id: string;
  name: string;
  user_id: string | null;
}

type AppRole = "admin" | "barber" | "client";
type UserStatus = "active" | "inactive";

interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  role: AppRole;
  status: UserStatus;
}

export function UsersRolesPage() {
  const { barbershop } = useBarbershopContext();
  const { currentCount, maxAllowed, canAddMore, planName, isLoading: isLoadingLimit } = useProfessionalLimit(barbershop?.id);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("barber");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  
  // Create barber dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBarberName, setNewBarberName] = useState("");
  const [newBarberEmail, setNewBarberEmail] = useState("");
  const [newBarberPassword, setNewBarberPassword] = useState("");
  const [newBarberPhone, setNewBarberPhone] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Fetch professionals without user_id (unlinked)
  const { data: unlinkedProfessionals } = useQuery({
    queryKey: ["unlinked-professionals", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name, user_id")
        .eq("barbershop_id", barbershop.id)
        .is("user_id", null)
        .order("name");
      if (error) throw error;
      return data as Professional[];
    },
    enabled: !!barbershop?.id,
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users-roles", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      
      // Fetch users with roles in this barbershop
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("barbershop_id", barbershop.id);

      if (rolesError) throw rolesError;

      if (!roles || roles.length === 0) return [];

      const userIds = roles.map(r => r.user_id);

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Combine data
      return roles.map(role => {
        const profile = profiles?.find(p => p.id === role.user_id);
        return {
          id: role.user_id,
          user_id: role.user_id,
          name: profile?.full_name || profile?.name || "Sem nome",
          email: profile?.email,
          phone: profile?.phone,
          created_at: profile?.created_at || new Date().toISOString(),
          role: role.role as AppRole,
          status: "active" as UserStatus,
        };
      });
    },
    enabled: !!barbershop?.id,
  });

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setIsDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!editingUser || !barbershop?.id) return;

    if (selectedRole === "admin") {
      const confirmed = confirm(
        `Tem certeza que deseja dar permissão de ADMINISTRADOR para ${editingUser.name}?`
      );
      if (!confirmed) return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: selectedRole })
        .eq("user_id", editingUser.user_id)
        .eq("barbershop_id", barbershop.id);

      if (error) throw error;

      toast.success(`Função atualizada para ${getRoleLabel(selectedRole)}`);
      queryClient.invalidateQueries({ queryKey: ["admin-users-roles"] });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar função");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!barbershop?.id) return;
    const confirmed = confirm(`Remover ${userName} da equipe?`);
    if (!confirmed) return;

    setIsRemoving(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("barbershop_id", barbershop.id);

      if (error) throw error;

      toast.success("Usuário removido");
      queryClient.invalidateQueries({ queryKey: ["admin-users-roles"] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover usuário");
    } finally {
      setIsRemoving(null);
    }
  };

  // Validate password
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Senha deve ter no mínimo 8 caracteres";
    }
    if (!/[a-zA-Z]/.test(password)) {
      return "Senha deve conter pelo menos uma letra";
    }
    if (!/[0-9]/.test(password)) {
      return "Senha deve conter pelo menos um número";
    }
    return null;
  };

  // Validate email
  const validateEmail = (email: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Email inválido";
    }
    return null;
  };

  const handleCreateBarber = async () => {
    if (!barbershop?.id) return;

    // Reset errors
    setPasswordError(null);
    setEmailError(null);

    // Validate inputs
    if (!newBarberName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    const emailValidation = validateEmail(newBarberEmail);
    if (emailValidation) {
      setEmailError(emailValidation);
      return;
    }

    const passwordValidation = validatePassword(newBarberPassword);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      return;
    }

    setIsCreating(true);

    try {
      // Call edge function to create barber
      const { data, error } = await supabase.functions.invoke('create-barber', {
        body: {
          barbershop_id: barbershop.id,
          name: newBarberName.trim(),
          email: newBarberEmail.toLowerCase().trim(),
          password: newBarberPassword,
          phone: newBarberPhone.replace(/\D/g, "") || "",
          professional_id: selectedProfessionalId || undefined,
        }
      });

      if (error) {
        throw new Error(error.message || "Erro ao criar barbeiro");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("Barbeiro criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-users-roles"] });
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-professionals"] });
      setIsCreateDialogOpen(false);
      resetCreateForm();
    } catch (error: any) {
      console.error("Erro ao criar barbeiro:", error);
      toast.error(error.message || "Erro ao criar barbeiro");
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewBarberName("");
    setNewBarberEmail("");
    setNewBarberPassword("");
    setNewBarberPhone("");
    setSelectedProfessionalId("");
    setShowPassword(false);
    setPasswordError(null);
    setEmailError(null);
  };

  const getRoleLabel = (role: AppRole) => {
    const labels: Record<AppRole, string> = {
      admin: "Administrador",
      barber: "Barbeiro",
      client: "Cliente",
    };
    return labels[role];
  };

  const getRoleBadgeColor = (role: AppRole) => {
    const colors: Record<AppRole, string> = {
      admin: "bg-primary/20 text-primary border-primary/30",
      barber: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      client: "bg-muted text-muted-foreground border-border",
    };
    return colors[role];
  };

  const filteredUsers = users?.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm)
  );

  const adminCount = users?.filter(u => u.role === "admin").length || 0;
  const barberCount = users?.filter(u => u.role === "barber").length || 0;

  if (!barbershop?.id) {
    return (
      <AdminPageScaffold
        title="Equipe"
        subtitle="Gerencie sua equipe de profissionais"
        icon={Shield}
      />
    );
  }

  return (
    <AdminPageScaffold
      title="Equipe"
      subtitle="Gerencie sua equipe de profissionais"
      icon={Shield}
      actions={
        canAddMore ? (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Adicionar Barbeiro
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Plan limit info */}
        <Alert className={!canAddMore ? "border-destructive bg-destructive/10" : "border-primary/30 bg-primary/5"}>
          <div className="flex items-center gap-2">
            {!canAddMore ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <Crown className="h-4 w-4 text-primary" />
            )}
            <AlertDescription className={!canAddMore ? "text-destructive" : "text-foreground"}>
              {getProfessionalLimitMessage(currentCount, maxAllowed, planName)}
              {!canAddMore && (
                <Button variant="link" asChild className="ml-2 p-0 h-auto text-primary">
                  <a href="/planos">Fazer upgrade</a>
                </Button>
              )}
            </AlertDescription>
          </div>
        </Alert>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{adminCount}</p>
                  <p className="text-sm text-muted-foreground">Administradores</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <User className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{barberCount}</p>
                  <p className="text-sm text-muted-foreground">Barbeiros</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <UserCog className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total na Equipe</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
            <CardDescription>Usuários com acesso ao sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers && filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {user.role === "admin" ? (
                                <Shield className="w-4 h-4 text-primary" />
                              ) : (
                                <User className="w-4 h-4 text-muted-foreground" />
                              )}
                              {user.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{user.email || "-"}</p>
                              <p className="text-muted-foreground">{user.phone || "-"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeColor(user.role)}>
                              {getRoleLabel(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleRemoveUser(user.id, user.name)}
                                disabled={isRemoving === user.id || user.user_id === currentUser?.id}
                              >
                                {isRemoving === user.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <p className="text-muted-foreground">
                            {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário na equipe"}
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Função</DialogTitle>
            <DialogDescription>
              Altere a função de {editingUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nova Função</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Administrador
                    </div>
                  </SelectItem>
                  <SelectItem value="barber">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Barbeiro
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRole === "admin" && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Administradores têm acesso total ao painel administrativo.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole} disabled={isUpdating}>
              {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Barber Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) resetCreateForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Barbeiro</DialogTitle>
            <DialogDescription>
              Crie uma conta para um novo profissional da equipe
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="barber-name">Nome Completo *</Label>
              <Input
                id="barber-name"
                value={newBarberName}
                onChange={(e) => setNewBarberName(e.target.value)}
                placeholder="Nome do Barbeiro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barber-email">Email *</Label>
              <Input
                id="barber-email"
                type="email"
                value={newBarberEmail}
                onChange={(e) => {
                  setNewBarberEmail(e.target.value);
                  setEmailError(null);
                }}
                placeholder="barbeiro@email.com"
                className={emailError ? "border-destructive" : ""}
              />
              {emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="barber-password">Senha *</Label>
              <div className="relative">
                <Input
                  id="barber-password"
                  type={showPassword ? "text" : "password"}
                  value={newBarberPassword}
                  onChange={(e) => {
                    setNewBarberPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Mínimo 8 caracteres"
                  className={passwordError ? "border-destructive pr-10" : "pr-10"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordError ? (
                <p className="text-xs text-destructive">{passwordError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Mínimo 8 caracteres, com pelo menos 1 letra e 1 número
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="barber-phone">Telefone (opcional)</Label>
              <Input
                id="barber-phone"
                type="tel"
                value={newBarberPhone}
                onChange={(e) => setNewBarberPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            {/* Professional Linking */}
            {unlinkedProfessionals && unlinkedProfessionals.length > 0 && (
              <div className="space-y-2">
                <Label>Vincular a Profissional Existente</Label>
                <Select 
                  value={selectedProfessionalId || "new"} 
                  onValueChange={(val) => setSelectedProfessionalId(val === "new" ? "" : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Criar novo profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Criar novo profissional
                      </div>
                    </SelectItem>
                    {unlinkedProfessionals.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        <div className="flex items-center gap-2">
                          <Link className="w-4 h-4" />
                          {prof.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Vincule a um profissional já cadastrado ou crie um novo automaticamente.
                </p>
              </div>
            )}

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                O barbeiro será criado com a função <strong>Barbeiro</strong> e terá acesso apenas à sua própria agenda.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetCreateForm();
              }} 
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateBarber} 
              disabled={isCreating || !newBarberName || !newBarberEmail || !newBarberPassword}
            >
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Barbeiro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageScaffold>
  );
}

export default UsersRolesPage;
