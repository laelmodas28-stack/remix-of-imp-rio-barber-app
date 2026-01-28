import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershop } from "@/hooks/useBarbershop";
import { useProfessionalLimit, getProfessionalLimitMessage } from "@/hooks/useProfessionalLimit";
import { Plus, Save, Camera, Loader2, AlertTriangle, Crown } from "lucide-react";
import { resizeImage, validateImageFile } from "@/lib/imageUtils";

interface Professional {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  rating: number | null;
  specialties: string[] | null;
  is_active: boolean | null;
}

interface ProfessionalFormProps {
  onSuccess: () => void;
  professional?: Professional | null;
}

const ProfessionalForm = ({ onSuccess, professional }: ProfessionalFormProps) => {
  const { barbershop } = useBarbershop();
  const { currentCount, maxAllowed, canAddMore, planName, isLoading: isLoadingLimit } = useProfessionalLimit(barbershop?.id);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [rating, setRating] = useState("5.0");
  const [isActive, setIsActive] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!professional;
  
  // Check if we can add a new professional (editing is always allowed)
  const isLimitReached = !isEditing && !canAddMore;

  useEffect(() => {
    if (professional) {
      setName(professional.name);
      setBio(professional.bio || "");
      setSpecialties(professional.specialties?.join(", ") || "");
      setRating(professional.rating?.toString() || "5.0");
      setIsActive(professional.is_active ?? true);
      setPhotoUrl(professional.photo_url);
    } else {
      setName("");
      setBio("");
      setSpecialties("");
      setRating("5.0");
      setIsActive(true);
      setPhotoUrl(null);
    }
  }, [professional]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file, 5);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsUploading(true);
    try {
      const resizedFile = await resizeImage(file, 800, 800);
      const fileExt = resizedFile.name.split('.').pop()?.toLowerCase();
      const professionalId = professional?.id || `temp-${Date.now()}`;
      const fileName = `${professionalId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('professional-photos')
        .upload(fileName, resizedFile, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('professional-photos')
        .getPublicUrl(fileName);

      if (professional) {
        const { error: updateError } = await supabase
          .from('professionals')
          .update({ photo_url: publicUrl })
          .eq('id', professional.id);

        if (updateError) throw updateError;
      }

      setPhotoUrl(publicUrl);
      toast.success("Foto atualizada!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!barbershop) {
      toast.error("Barbearia não encontrada");
      return;
    }

    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsSubmitting(true);

    try {
      const specialtiesArray = specialties
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const data = {
        name: name.trim(),
        bio: bio.trim() || null,
        specialties: specialtiesArray.length > 0 ? specialtiesArray : null,
        rating: parseFloat(rating),
        is_active: isActive,
        photo_url: photoUrl,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("professionals")
          .update(data)
          .eq("id", professional.id);

        if (error) throw error;
        toast.success("Profissional atualizado!");
      } else {
        const { error } = await supabase.from("professionals").insert({
          ...data,
          barbershop_id: barbershop.id,
        });

        if (error) throw error;
        toast.success("Profissional cadastrado!");
      }
      
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao salvar profissional:", error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Plan limit warning */}
      {!isEditing && (
        <Alert className={isLimitReached ? "border-destructive bg-destructive/10" : "border-primary/30 bg-primary/5"}>
          <div className="flex items-center gap-2">
            {isLimitReached ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <Crown className="h-4 w-4 text-primary" />
            )}
            <AlertDescription className={isLimitReached ? "text-destructive" : "text-foreground"}>
              {getProfessionalLimitMessage(currentCount, maxAllowed, planName)}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {isLimitReached ? (
        <div className="text-center py-4">
          <p className="text-muted-foreground mb-4">
            Para adicionar mais profissionais, faça upgrade do seu plano.
          </p>
          <Button variant="premium" asChild>
            <a href="/planos">
              <Crown className="w-4 h-4 mr-2" />
              Ver Planos
            </a>
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-center">
            <div className="relative group">
              <Avatar className="h-28 w-28 border-4 border-border shadow-lg">
                <AvatarImage src={photoUrl || undefined} className="object-cover" />
                <AvatarFallback className="text-2xl font-semibold bg-muted">
                  {name ? name.slice(0, 2).toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 border-2 border-background"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prof-name">Nome *</Label>
            <Input
              id="prof-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do profissional"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prof-bio">Biografia</Label>
            <Textarea
              id="prof-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Breve descrição sobre o profissional..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prof-specialties">Especialidades</Label>
            <Input
              id="prof-specialties"
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
              placeholder="Ex: Barba, Corte Moderno, Degradê"
            />
            <p className="text-xs text-muted-foreground">
              Separe as especialidades por vírgula
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prof-rating">Avaliação</Label>
              <Input
                id="prof-rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="prof-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="prof-active">Ativo</Label>
            </div>
          </div>

          <Button
            type="submit"
            variant="imperial"
            className="w-full"
            disabled={isSubmitting || isUploading || isLoadingLimit}
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? "Salvando..." : "Salvar Alterações"}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {isSubmitting ? "Cadastrando..." : "Cadastrar Profissional"}
              </>
            )}
          </Button>
        </>
      )}
    </form>
  );
};

export default ProfessionalForm;
