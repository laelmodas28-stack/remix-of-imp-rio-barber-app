import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, UserCog, Shield, User, Loader2, AlertTriangle } from "lucide-react";
import { WhatsAppButton } from "./WhatsAppButton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserManagementProps {
  barbershopId: string;
}

type AppRole = "admin" | "barber" | "client" | "super_admin";

interface UserWithRole {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
  role: AppRole;
  barbershop_id: string | null;
}

export const UserManagement = ({ barbershopId }: UserManagementProps) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("client");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  // Fetch only users related to THIS barbershop
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["admin-users", barbershopId],
    queryFn: async () => {
      // 1. Fetch clients from barbershop_clients table (use client_id, not user_id)
      const { data: barbershopClients, error: clientsError } = await supabase
        .from("barbershop_clients")
        .select("client_id")
        .eq("barbershop_id", barbershopId);

      if (clientsError) throw clientsError;

      // 2. Fetch users with roles in this barbershop
      const { data: rolesInBarbershop, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("barbershop_id", barbershopId);

      if (rolesError) throw rolesError;

      // Combine unique user IDs
      const clientIds = barbershopClients?.map(c => c.client_id) || [];
      const roleUserIds = rolesInBarbershop?.map(r => r.user_id) || [];
      const uniqueUserIds = [...new Set([...clientIds, ...roleUserIds])];

      if (uniqueUserIds.length === 0) {
        return [];
      }

      // 3. Fetch profiles for these users only
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", uniqueUserIds)
        .order("full_name");

      if (profilesError) throw profilesError;

      // Map profiles with their roles for current barbershop
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = rolesInBarbershop?.find(r => r.user_id === profile.id);
        
        return {
          id: profile.id,
          name: profile.full_name || "Sem nome",
          phone: profile.phone,
          created_at: profile.created_at,
          role: (userRole?.role as AppRole) || "client",
          barbershop_id: userRole ? barbershopId : null,
        };
      });

      return usersWithRoles;
    },
  });

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setIsDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!editingUser) return;

    // Confirmation for admin role
    if (selectedRole === "admin") {
      const confirmed = confirm(
        `Tem certeza que deseja dar permissão de ADMINISTRADOR para ${editingUser.name}?\n\nAdministradores têm acesso total ao painel e podem gerenciar todos os dados da barbearia.`
      );
      if (!confirmed) return;
    }

    setIsUpdating(true);
    try {
      // Check if user already has a role for this barbershop
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", editingUser.id)
        .eq("barbershop_id", barbershopId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: selectedRole })
          .eq("id", existingRole.id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: editingUser.id,
            role: selectedRole,
            barbershop_id: barbershopId,
          });

        if (error) throw error;
      }

      toast.success(`Função do usuário atualizada para ${getRoleLabel(selectedRole)}`);
      queryClient.invalidateQueries({ queryKey: ["admin-users", barbershopId] });
      setIsDialogOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error(error.message || "Erro ao atualizar função do usuário");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveFromBarbershop = async (userId: string, userName: string) => {
    const confirmed = confirm(
      `Tem certeza que deseja remover ${userName} da barbearia?\n\nEsta ação pode ser revertida adicionando o usuário novamente.`
    );
    if (!confirmed) return;

    setIsRemoving(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("barbershop_id", barbershopId);

      if (error) throw error;

      toast.success("Usuário removido da barbearia");
      queryClient.invalidateQueries({ queryKey: ["admin-users", barbershopId] });
    } catch (error: any) {
      console.error("Error removing user:", error);
      toast.error(error.message || "Erro ao remover usuário");
    } finally {
      setIsRemoving(null);
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Administrador";
      case "barber":
        return "Barbeiro";
      case "client":
        return "Cliente";
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case "super_admin":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case "admin":
        return "bg-primary/20 text-primary border-primary/30";
      case "barber":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      case "client":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "";
    }
  };

  const filteredUsers = users?.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm)
  );

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Carregando usuários...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-destructive" />
          <p className="text-destructive font-medium">Erro ao carregar usuários</p>
          <p className="text-sm text-muted-foreground mt-1">
            {(error as any).message || "Tente novamente mais tarde"}
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-users", barbershopId] })}
          >
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Gerenciamento de Usuários
          </CardTitle>
          <CardDescription>
            Gerencie os usuários e suas funções na barbearia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Cadastrado em</TableHead>
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
                          {user.name || "Sem nome"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{user.phone || "-"}</span>
                          <WhatsAppButton phone={user.phone} clientName={user.name} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            Editar Função
                          </Button>
                          {user.barbershop_id === barbershopId && user.role !== "admin" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveFromBarbershop(user.id, user.name)}
                              disabled={isRemoving === user.id}
                            >
                              {isRemoving === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Remover"
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {searchTerm
                          ? "Nenhum usuário encontrado"
                          : "Nenhum usuário cadastrado nesta barbearia"}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <Card className="border-border bg-card/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {users?.filter((u) => u.role === "admin").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Administradores</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-500">
                  {users?.filter((u) => u.role === "barber").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Barbeiros</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">
                  {users?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total de Usuários</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Função do Usuário</DialogTitle>
            <DialogDescription>
              Altere a função de {editingUser?.name || "usuário"} nesta barbearia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <p className="text-sm text-muted-foreground">
                {editingUser?.name} ({editingUser?.phone || "Sem telefone"})
              </p>
            </div>

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
                  ⚠️ Administradores têm acesso total ao painel administrativo e podem gerenciar todos os dados da barbearia.
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
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};