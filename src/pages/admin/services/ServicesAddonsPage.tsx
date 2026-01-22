import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { DataTable, Column } from "@/components/admin/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { PackagePlus, Plus, Clock, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Addon {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean | null;
  created_at: string;
}

interface AddonFormData {
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  is_active: boolean;
}

const defaultFormData: AddonFormData = {
  name: "",
  description: "",
  price: "",
  duration_minutes: "15",
  is_active: true,
};

export function ServicesAddonsPage() {
  const { barbershop } = useBarbershopContext();
  const queryClient = useQueryClient();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [deleteAddon, setDeleteAddon] = useState<Addon | null>(null);
  const [formData, setFormData] = useState<AddonFormData>(defaultFormData);

  const { data: addons = [], isLoading } = useQuery({
    queryKey: ["admin-service-addons", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("service_addons")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("name");
      if (error) throw error;
      return data as Addon[];
    },
    enabled: !!barbershop?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: AddonFormData) => {
      if (!barbershop?.id) throw new Error("Barbearia não encontrada");
      const { error } = await supabase.from("service_addons").insert({
        barbershop_id: barbershop.id,
        name: data.name,
        description: data.description || null,
        price: parseFloat(data.price),
        duration_minutes: parseInt(data.duration_minutes),
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Adicional criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-service-addons"] });
      handleCloseSheet();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao criar adicional");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AddonFormData }) => {
      const { error } = await supabase
        .from("service_addons")
        .update({
          name: data.name,
          description: data.description || null,
          price: parseFloat(data.price),
          duration_minutes: parseInt(data.duration_minutes),
          is_active: data.is_active,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Adicional atualizado!");
      queryClient.invalidateQueries({ queryKey: ["admin-service-addons"] });
      handleCloseSheet();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao atualizar adicional");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_addons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Adicional removido!");
      queryClient.invalidateQueries({ queryKey: ["admin-service-addons"] });
      setDeleteAddon(null);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao remover adicional");
    },
  });

  const handleOpenCreate = () => {
    setEditingAddon(null);
    setFormData(defaultFormData);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (addon: Addon) => {
    setEditingAddon(addon);
    setFormData({
      name: addon.name,
      description: addon.description || "",
      price: addon.price.toString(),
      duration_minutes: addon.duration_minutes.toString(),
      is_active: addon.is_active ?? true,
    });
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingAddon(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      toast.error("Preencha nome e preço");
      return;
    }
    if (editingAddon) {
      updateMutation.mutate({ id: editingAddon.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns: Column<Addon>[] = [
    {
      key: "name",
      header: "Adicional",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
            <PackagePlus className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <p className="font-medium">{item.name}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {item.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "price",
      header: "Preço",
      sortable: true,
      cell: (item) => (
        <span className="font-semibold text-success">
          +R$ {item.price.toFixed(2)}
        </span>
      ),
    },
    {
      key: "duration_minutes",
      header: "Tempo Extra",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>+{item.duration_minutes} min</span>
        </div>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      cell: (item) => (
        <Badge variant={item.is_active ? "default" : "secondary"}>
          {item.is_active ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(item);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteAddon(item);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adicionais"
        subtitle="Serviços complementares e extras"
        actions={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Adicional
          </Button>
        }
      />

      <DataTable
        data={addons}
        columns={columns}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Buscar adicional..."
        searchKeys={["name", "description"]}
        pageSize={10}
        onRowClick={handleOpenEdit}
        emptyState={{
          icon: PackagePlus,
          title: "Nenhum adicional cadastrado",
          description: "Adicionais são serviços extras que complementam os principais",
          action: {
            label: "Criar Adicional",
            onClick: handleOpenCreate,
            icon: Plus,
          },
        }}
      />

      {/* Create/Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingAddon ? "Editar Adicional" : "Novo Adicional"}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ex: Hidratação, Sobrancelha..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Descrição do adicional..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço Extra (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Tempo Extra (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  step="5"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      duration_minutes: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">Adicional Ativo</p>
                <p className="text-xs text-muted-foreground">
                  Adicionais inativos não aparecem para clientes
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={handleCloseSheet}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingAddon ? "Salvar" : "Criar"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAddon} onOpenChange={() => setDeleteAddon(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Adicional</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{deleteAddon?.name}"? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAddon && deleteMutation.mutate(deleteAddon.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ServicesAddonsPage;
