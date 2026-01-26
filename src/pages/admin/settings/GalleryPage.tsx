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
        <Button 
          onClick={() => setIsUploadOpen(true)} 
          disabled={gallery && gallery.length >= 20}
          size="sm"
          className="gap-2"
        >
          <ImagePlus className="w-4 h-4" />
          <span className="hidden sm:inline">Adicionar Foto</span>
          <span className="sm:hidden">Adicionar</span>
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : gallery && gallery.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
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
                  
                  {/* Delete button - always visible on mobile, hover on desktop */}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7 sm:h-8 sm:w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md"
                    onClick={() => setDeleteId(image.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </div>
                
                {image.title && (
                  <div className="p-1.5 sm:p-2 bg-card">
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{image.title}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
            <Images className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/50 mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium mb-2 text-center">Nenhuma foto na galeria</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Adicione fotos dos seus trabalhos para exibir aos clientes
            </p>
            <Button onClick={() => setIsUploadOpen(true)} size="sm" className="gap-2">
              <ImagePlus className="w-4 h-4" />
              Adicionar Primeira Foto
            </Button>
          </CardContent>
        </Card>
      )}

      {gallery && gallery.length > 0 && (
        <p className="text-xs sm:text-sm text-muted-foreground text-center mt-3 sm:mt-4 px-2">
          {gallery.length}/20 fotos • Fotos exibidas na página pública
        </p>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Adicionar Foto</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Faça upload de uma foto para exibir na página pública
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="title" className="text-sm">Título (opcional)</Label>
              <Input
                id="title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Ex: Corte degradê moderno"
                className="h-9 sm:h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm">Imagem</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 text-center">
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
                  className="cursor-pointer flex flex-col items-center gap-1.5 sm:gap-2"
                >
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary" />
                  ) : (
                    <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                  )}
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {isUploading ? "Enviando..." : "Toque para selecionar"}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
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
