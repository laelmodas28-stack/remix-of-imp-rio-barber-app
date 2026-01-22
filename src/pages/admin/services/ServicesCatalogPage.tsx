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
import { Scissors, Plus, Clock, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean | null;
  created_at: string;
}

interface ServiceFormData {
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  is_active: boolean;
}

const defaultFormData: ServiceFormData = {
  name: "",
  description: "",
  price: "",
  duration_minutes: "30",
  is_active: true,
};

export function ServicesCatalogPage() {
  const { barbershop } = useBarbershopContext();
  const queryClient = useQueryClient();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteService, setDeleteService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(defaultFormData);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["admin-services", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("name");
      if (error) throw error;
      return data as Service[];
    },
    enabled: !!barbershop?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      if (!barbershop?.id) throw new Error("Barbearia não encontrada");
      const { error } = await supabase.from("services").insert({
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
      toast.success("Serviço criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      handleCloseSheet();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao criar serviço");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ServiceFormData }) => {
      const { error } = await supabase
        .from("services")
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
      toast.success("Serviço atualizado!");
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      handleCloseSheet();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao atualizar serviço");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Serviço removido!");
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      setDeleteService(null);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao remover serviço. Verifique se não há agendamentos vinculados.");
    },
  });

  const handleOpenCreate = () => {
    setEditingService(null);
    setFormData(defaultFormData);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      price: service.price.toString(),
      duration_minutes: service.duration_minutes.toString(),
      is_active: service.is_active ?? true,
    });
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingService(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      toast.error("Preencha nome e preço");
      return;
    }
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns: Column<Service>[] = [
    {
      key: "name",
      header: "Serviço",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Scissors className="h-5 w-5 text-primary" />
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
        <span className="font-semibold">
          R$ {item.price.toFixed(2)}
        </span>
      ),
    },
    {
      key: "duration_minutes",
      header: "Duração",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{item.duration_minutes} min</span>
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
              setDeleteService(item);
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
        title="Catálogo de Serviços"
        subtitle={`${services.length} serviços cadastrados`}
        actions={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Serviço
          </Button>
        }
      />

      <DataTable
        data={services}
        columns={columns}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Buscar serviço..."
        searchKeys={["name", "description"]}
        pageSize={10}
        onRowClick={handleOpenEdit}
        emptyState={{
          icon: Scissors,
          title: "Nenhum serviço cadastrado",
          description: "Comece adicionando os serviços oferecidos pela barbearia",
          action: {
            label: "Criar Serviço",
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
              {editingService ? "Editar Serviço" : "Novo Serviço"}
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
                placeholder="Ex: Corte Masculino"
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
                placeholder="Descrição do serviço..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$) *</Label>
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
                <Label htmlFor="duration">Duração (min) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
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
                <p className="font-medium text-sm">Serviço Ativo</p>
                <p className="text-xs text-muted-foreground">
                  Serviços inativos não aparecem para clientes
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
                {editingService ? "Salvar" : "Criar"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteService} onOpenChange={() => setDeleteService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{deleteService?.name}"? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteService && deleteMutation.mutate(deleteService.id)}
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

export default ServicesCatalogPage;
