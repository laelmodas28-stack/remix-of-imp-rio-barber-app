import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, Save, X, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";

type Service = Tables<"services">;

interface ServiceCardProps {
  service: Service;
  onUpdate: () => void;
}

export const ServiceCard = ({ service, onUpdate }: ServiceCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description || "");
  const [price, setPrice] = useState(service.price.toString());
  const [duration, setDuration] = useState(service.duration_minutes.toString());
  const [isActive, setIsActive] = useState(service.is_active ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("services")
        .update({
          name,
          description: description || null,
          price: parseFloat(price) || 0,
          duration_minutes: parseInt(duration) || 30,
          is_active: isActive,
        })
        .eq("id", service.id);

      if (error) throw error;

      toast.success("Serviço atualizado!");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar serviço");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", service.id);

      if (error) throw error;

      toast.success("Serviço excluído!");
      onUpdate();
    } catch (error: any) {
      console.error(error);
      if (error.code === "23503") {
        toast.error("Não é possível excluir: serviço tem agendamentos vinculados");
      } else {
        toast.error("Erro ao excluir serviço");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setName(service.name);
    setDescription(service.description || "");
    setPrice(service.price.toString());
    setDuration(service.duration_minutes.toString());
    setIsActive(service.is_active ?? true);
    setIsEditing(false);
  };

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="space-y-3">
          {isEditing ? (
            <>
              <div>
                <Label className="text-xs">Nome</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do serviço"
                />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição do serviço"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Preço (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Duração (min)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label className="text-xs">Ativo</Label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-1" />
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg">{service.name}</p>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O serviço será removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground"
                        >
                          {isDeleting ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-primary font-bold text-lg">R$ {service.price.toFixed(2)}</span>
                <span className="text-muted-foreground">{service.duration_minutes} min</span>
                <Badge variant={service.is_active ? "default" : "secondary"}>
                  {service.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
