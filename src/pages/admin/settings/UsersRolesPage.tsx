import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Search, UserCog, User, UserPlus, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RegistrationCodeManager } from "@/components/admin/RegistrationCodeManager";

type AppRole = "admin" | "barber" | "client";

interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  role: AppRole;
}

export function UsersRolesPage() {
  const { barbershop } = useBarbershopContext();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("client");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [showInviteManager, setShowInviteManager] = useState(false);

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
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Combine data
      return roles.map(role => {
        const profile = profiles?.find(p => p.user_id === role.user_id);
        return {
          id: role.user_id,
          user_id: role.user_id,
          name: profile?.name || "Sem nome",
          email: profile?.email,
          phone: profile?.phone,
          created_at: profile?.created_at || new Date().toISOString(),
          role: role.role as AppRole,
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
        title="Usuários e Funções"
        subtitle="Gerencie usuários e permissões de acesso"
        icon={Shield}
      />
    );
  }

  return (
    <AdminPageScaffold
      title="Usuários e Funções"
      subtitle="Gerencie usuários e permissões de acesso"
      icon={Shield}
      actions={
        <Button onClick={() => setShowInviteManager(!showInviteManager)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Convidar Usuário
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Invite Manager */}
        {showInviteManager && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Códigos de Convite
              </CardTitle>
              <CardDescription>
                Gere códigos para convidar barbeiros e administradores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegistrationCodeManager />
            </CardContent>
          </Card>
        )}

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
            <CardDescription>Usuários com acesso ao painel administrativo</CardDescription>
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
                                disabled={isRemoving === user.id}
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
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Cliente
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRole === "admin" && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠️ Administradores têm acesso total ao painel administrativo.
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
    </AdminPageScaffold>
  );
}

export default UsersRolesPage;
