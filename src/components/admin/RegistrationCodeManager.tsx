import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Key, Copy, Trash2, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const RegistrationCodeManager = () => {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [expirationDays, setExpirationDays] = useState(30);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all registration codes
  const { data: codes, isLoading: codesLoading } = useQuery({
    queryKey: ["registration-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registration_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(code);
  };

  const handleCreateCode = async () => {
    if (!newCode.trim()) {
      toast.error("Digite um código válido");
      return;
    }

    setIsLoading(true);
    try {
      // Calcular data de expiração apenas se hasExpiration for true
      const expiresAt = hasExpiration ? (() => {
        const date = new Date();
        date.setDate(date.getDate() + expirationDays);
        return date.toISOString();
      })() : null;

      const { error } = await supabase.from("registration_codes").insert({
        code: newCode.toUpperCase().trim(),
        expires_at: expiresAt,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Este código já existe");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Código de acesso criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["registration-codes"] });
      setIsDialogOpen(false);
      setNewCode("");
      setHasExpiration(false);
      setExpirationDays(30);
    } catch (error: any) {
      console.error("Error creating code:", error);
      toast.error(error.message || "Erro ao criar código");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm("Tem certeza que deseja excluir este código?")) return;

    try {
      const { error } = await supabase
        .from("registration_codes")
        .delete()
        .eq("id", codeId);

      if (error) throw error;

      toast.success("Código excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["registration-codes"] });
    } catch (error: any) {
      console.error("Error deleting code:", error);
      toast.error(error.message || "Erro ao excluir código");
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  const getCodeStatus = (code: any) => {
    if (code.is_used) {
      return { label: "Usado", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", icon: CheckCircle };
    }
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return { label: "Expirado", color: "bg-red-500/20 text-red-500 border-red-500/30", icon: XCircle };
    }
    return { label: "Disponível", color: "bg-green-500/20 text-green-500 border-green-500/30", icon: Clock };
  };

  if (codesLoading) {
    return (
      <Card className="border-border">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Carregando códigos...</p>
        </CardContent>
      </Card>
    );
  }

  const availableCodes = codes?.filter(c => !c.is_used && (!c.expires_at || new Date(c.expires_at) > new Date()));
  const usedCodes = codes?.filter(c => c.is_used);

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Códigos de Acesso
              </CardTitle>
              <CardDescription>
                Gerencie os códigos para cadastro de novas barbearias
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Código
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Código de Acesso</DialogTitle>
                  <DialogDescription>
                    Este código será usado para cadastrar novas barbearias na plataforma
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Código</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                        placeholder="Ex: BARBER2024"
                        className="uppercase"
                      />
                      <Button variant="outline" onClick={generateRandomCode}>
                        Gerar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use letras e números. Será convertido para maiúsculas.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="has-expiration"
                        checked={hasExpiration}
                        onChange={(e) => setHasExpiration(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="has-expiration" className="cursor-pointer">
                        Definir data de expiração
                      </Label>
                    </div>
                    {hasExpiration && (
                      <div className="space-y-2 ml-6">
                        <Label htmlFor="expiration-days">Validade (dias)</Label>
                        <Input
                          id="expiration-days"
                          type="number"
                          value={expirationDays}
                          onChange={(e) => setExpirationDays(parseInt(e.target.value) || 30)}
                          min={1}
                          max={365}
                        />
                        <p className="text-xs text-muted-foreground">
                          O código expira após {expirationDays} dias
                        </p>
                      </div>
                    )}
                    {!hasExpiration && (
                      <p className="text-xs text-muted-foreground ml-6">
                        O código não terá data de expiração
                      </p>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateCode} disabled={isLoading}>
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Criar Código
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-border bg-card/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-500">
                  {availableCodes?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Disponíveis</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-500">
                  {usedCodes?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Usados</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">
                  {codes?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </CardContent>
            </Card>
          </div>

          {/* Codes Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Usado por</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes && codes.length > 0 ? (
                  codes.map((code) => {
                    const status = getCodeStatus(code);
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono font-bold">
                          {code.code}
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(code.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {code.expires_at
                            ? format(new Date(code.expires_at), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {code.is_used && code.used_by
                            ? "Sim"
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyCode(code.code)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            {!code.is_used && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteCode(code.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Key className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Nenhum código cadastrado
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Clique em "Novo Código" para criar um código de acesso
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Instructions */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">Como funciona?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>1. Crie um código de acesso para o novo cliente</li>
                <li>2. Envie o código para o proprietário da barbearia</li>
                <li>3. Ele acessa <strong>/registro-barbeiro</strong> e usa o código</li>
                <li>4. A barbearia é criada automaticamente com dados iniciais</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
