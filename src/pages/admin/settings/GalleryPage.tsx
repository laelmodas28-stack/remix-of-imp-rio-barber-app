import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Images, 
  Upload, 
  Trash2, 
  Loader2, 
  GripVertical,
  ImagePlus,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface GalleryImage {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  display_order: number | null;
}

export function GalleryPage() {
  const { barbershop } = useBarbershopContext();
  const queryClient = useQueryClient();
  
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");

  const { data: gallery, isLoading } = useQuery({
    queryKey: ["admin-gallery", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("gallery")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as GalleryImage[];
    },
    enabled: !!barbershop?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gallery")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Imagem removida com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover imagem");
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !barbershop?.id) return;

    // Validation
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPEG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${barbershop.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(fileName);

      // Get next display order
      const nextOrder = (gallery?.length || 0) + 1;

      // Insert into gallery table
      const { error: insertError } = await supabase
        .from("gallery")
        .insert({
          barbershop_id: barbershop.id,
          image_url: publicUrl,
          title: uploadTitle || null,
          display_order: nextOrder,
        });

      if (insertError) throw insertError;

      toast.success("Imagem adicionada à galeria!");
      queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
      setIsUploadOpen(false);
      setUploadTitle("");
    } catch (error: any) {
      console.error("Erro ao enviar imagem:", error);
      toast.error(error.message || "Erro ao enviar imagem");
    } finally {
      setIsUploading(false);
    }
  };

  if (!barbershop?.id) {
    return (
      <AdminPageScaffold
        title="Galeria de Fotos"
        subtitle="Gerencie as fotos exibidas na página pública"
        icon={Images}
      />
    );
  }

  return (
    <AdminPageScaffold
      title="Galeria de Fotos"
      subtitle="Gerencie as fotos exibidas na página pública da barbearia"
      icon={Images}
      actions={
        <Button onClick={() => setIsUploadOpen(true)} disabled={gallery && gallery.length >= 20}>
          <ImagePlus className="w-4 h-4 mr-2" />
          Adicionar Foto
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : gallery && gallery.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {gallery.map((image) => (
            <Card key={image.id} className="group relative overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-square relative">
                  <img
                    src={image.image_url}
                    alt={image.title || "Foto da galeria"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setDeleteId(image.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {image.title && (
                  <div className="p-2 bg-card">
                    <p className="text-xs text-muted-foreground truncate">{image.title}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Images className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma foto na galeria</h3>
            <p className="text-muted-foreground text-center mb-4">
              Adicione fotos dos seus trabalhos para exibir aos clientes
            </p>
            <Button onClick={() => setIsUploadOpen(true)}>
              <ImagePlus className="w-4 h-4 mr-2" />
              Adicionar Primeira Foto
            </Button>
          </CardContent>
        </Card>
      )}

      {gallery && gallery.length > 0 && (
        <p className="text-sm text-muted-foreground text-center mt-4">
          {gallery.length}/20 fotos • Estas fotos aparecem na página pública da sua barbearia
        </p>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Foto à Galeria</DialogTitle>
            <DialogDescription>
              Faça upload de uma foto para exibir na página pública
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título (opcional)</Label>
              <Input
                id="title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Ex: Corte degradê moderno"
              />
            </div>

            <div className="space-y-2">
              <Label>Imagem</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="gallery-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="gallery-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {isUploading ? "Enviando..." : "Clique para selecionar"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PNG, JPEG ou WebP • Máx 5MB
                  </span>
                </label>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A foto será removida da galeria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageScaffold>
  );
}

export default GalleryPage;
