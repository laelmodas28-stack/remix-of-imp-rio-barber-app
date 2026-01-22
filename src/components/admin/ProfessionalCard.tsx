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
import ImageUpload from "@/components/ImageUpload";
import { resizeImage } from "@/lib/imageUtils";
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

interface Professional {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  rating: number | null;
  specialties: string[] | null;
  is_active: boolean | null;
}

interface ProfessionalCardProps {
  professional: Professional;
  onUpdate: () => void;
}

export const ProfessionalCard = ({ professional, onUpdate }: ProfessionalCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(professional.name);
  const [bio, setBio] = useState(professional.bio || "");
  const [specialties, setSpecialties] = useState(professional.specialties?.join(", ") || "");
  const [rating, setRating] = useState(professional.rating?.toString() || "5.0");
  const [isActive, setIsActive] = useState(professional.is_active ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("professionals")
        .update({
          name,
          bio: bio || null,
          specialties: specialties ? specialties.split(",").map(s => s.trim()) : [],
          rating: parseFloat(rating) || 5.0,
          is_active: isActive,
        })
        .eq("id", professional.id);

      if (error) throw error;

      toast.success("Profissional atualizado!");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar profissional");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("professionals")
        .delete()
        .eq("id", professional.id);

      if (error) throw error;

      toast.success("Profissional excluído!");
      onUpdate();
    } catch (error: any) {
      console.error(error);
      if (error.code === "23503") {
        toast.error("Não é possível excluir: profissional tem agendamentos vinculados");
      } else {
        toast.error("Erro ao excluir profissional");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      toast.info("Enviando foto...");
      const resizedFile = await resizeImage(file, 800, 800);

      const fileExt = resizedFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${professional.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('professional-photos')
        .upload(fileName, resizedFile, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('professional-photos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('professionals')
        .update({ photo_url: publicUrl })
        .eq('id', professional.id);

      if (updateError) throw updateError;

      toast.success("Foto atualizada!");
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fazer upload da foto");
    }
  };

  const handleCancel = () => {
    setName(professional.name);
    setBio(professional.bio || "");
    setSpecialties(professional.specialties?.join(", ") || "");
    setRating(professional.rating?.toString() || "5.0");
    setIsActive(professional.is_active ?? true);
    setIsEditing(false);
  };

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex gap-4 items-start">
          <div className="w-32 flex-shrink-0">
            <ImageUpload
              label=""
              currentImageUrl={professional.photo_url}
              onImageSelect={handlePhotoUpload}
              maxSizeMB={5}
              maxWidth={800}
              maxHeight={800}
              aspectRatio="square"
              className="w-full"
            />
          </div>
          
          <div className="flex-1 space-y-3">
            {isEditing ? (
              <>
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome do profissional"
                  />
                </div>
                <div>
                  <Label className="text-xs">Bio</Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Descrição do profissional"
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-xs">Especialidades (separadas por vírgula)</Label>
                  <Input
                    value={specialties}
                    onChange={(e) => setSpecialties(e.target.value)}
                    placeholder="Corte, Barba, Degradê"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-xs">Avaliação</Label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                    <Label className="text-xs">Ativo</Label>
                  </div>
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
                    <p className="font-semibold text-lg">{professional.name}</p>
                    <p className="text-sm text-muted-foreground">{professional.bio}</p>
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
                          <AlertDialogTitle>Excluir profissional?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O profissional será removido permanentemente.
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
                {professional.specialties && professional.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {professional.specialties.map((specialty, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-primary font-semibold">⭐ {professional.rating}</span>
                  <Badge variant={professional.is_active ? "default" : "secondary"}>
                    {professional.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
