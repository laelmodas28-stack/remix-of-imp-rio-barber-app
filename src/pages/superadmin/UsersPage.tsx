import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Search, 
  User, 
  Loader2,
  CheckCircle,
  XCircle,
  Trash2,
  UserX,
  UserCheck,
  Shield,
  Mail,
  Phone
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  roles: { role: string; barbershop_id: string | null }[];
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionType, setActionType] = useState<'delete' | 'deactivate' | 'activate' | null>(null);

  // Fetch all users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ["superadmin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, is_active, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, barbershop_id");

      if (rolesError) throw rolesError;

      // Merge roles with profiles
      const merged = profiles?.map((profile) => ({
        ...profile,
        is_active: profile.is_active ?? true,
        roles: roles?.filter((r) => r.user_id === profile.id).map(r => ({
          role: r.role,
          barbershop_id: r.barbershop_id
        })) || [],
      }));

      return merged as UserProfile[];
    },
  });

  // Manage user mutation
  const manageUser = useMutation({
    mutationFn: async ({ action, userId }: { action: 'delete' | 'deactivate' | 'activate'; userId: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action, userId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_, variables) => {
      const messages = {
        delete: 'Usuário excluído com sucesso!',
        deactivate: 'Usuário desativado com sucesso!',
        activate: 'Usuário ativado com sucesso!'
      };
      toast.success(messages[variables.action]);
      queryClient.invalidateQueries({ queryKey: ["superadmin-users"] });
      setSelectedUser(null);
      setActionType(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao processar ação");
    },
  });

  const handleAction = (user: UserProfile, action: 'delete' | 'deactivate' | 'activate') => {
    setSelectedUser(user);
    setActionType(action);
  };

  const confirmAction = () => {
    if (selectedUser && actionType) {
      manageUser.mutate({ action: actionType, userId: selectedUser.id });
    }
  };

  const filteredUsers = users?.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search)
  );

  const getRoleBadge = (roles: { role: string; barbershop_id: string | null }[]) => {
    if (roles.some(r => r.role === 'super_admin')) {
      return <Badge className="bg-purple-600"><Shield className="w-3 h-3 mr-1" />Super Admin</Badge>;
    }
    if (roles.some(r => r.role === 'admin')) {
      return <Badge variant="default">Admin</Badge>;
    }
    if (roles.some(r => r.role === 'barber')) {
      return <Badge variant="secondary">Barbeiro</Badge>;
    }
    return <Badge variant="outline">Cliente</Badge>;
  };

  const getActionDialogContent = () => {
    switch (actionType) {
      case 'delete':
        return {
          title: 'Excluir Usuário',
          description: `Tem certeza que deseja excluir permanentemente o usuário "${selectedUser?.full_name || selectedUser?.email}"? Esta ação não pode ser desfeita e removerá todos os dados associados.`,
          confirmText: 'Excluir',
          variant: 'destructive' as const
        };
      case 'deactivate':
        return {
          title: 'Desativar Usuário',
          description: `Tem certeza que deseja desativar o usuário "${selectedUser?.full_name || selectedUser?.email}"? O usuário não poderá mais fazer login até ser reativado.`,
          confirmText: 'Desativar',
          variant: 'destructive' as const
        };
      case 'activate':
        return {
          title: 'Ativar Usuário',
          description: `Deseja reativar o usuário "${selectedUser?.full_name || selectedUser?.email}"? O usuário poderá fazer login novamente.`,
          confirmText: 'Ativar',
          variant: 'default' as const
        };
      default:
        return { title: '', description: '', confirmText: '', variant: 'default' as const };
    }
  };

  const dialogContent = getActionDialogContent();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usuários</h1>
        <p className="text-muted-foreground">
          Gerencie todos os usuários da plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Usuários</CardTitle>
              <CardDescription>
                {users?.length || 0} usuários cadastrados
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => {
                  const isSuperAdmin = user.roles.some(r => r.role === 'super_admin');
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{user.full_name || "Sem nome"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-sm">
                          {user.email && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </span>
                          )}
                          {user.phone && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.roles)}</TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            <XCircle className="w-3 h-3 mr-1" />
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isSuperAdmin && (
                            <>
                              {user.is_active ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAction(user, 'deactivate')}
                                  title="Desativar usuário"
                                >
                                  <UserX className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAction(user, 'activate')}
                                  title="Ativar usuário"
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleAction(user, 'delete')}
                                title="Excluir usuário"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {isSuperAdmin && (
                            <span className="text-xs text-muted-foreground">Protegido</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!actionType} onOpenChange={() => { setActionType(null); setSelectedUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={dialogContent.variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              disabled={manageUser.isPending}
            >
              {manageUser.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                dialogContent.confirmText
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default UsersPage;
