import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Link as LinkIcon, Instagram, MessageCircle, Edit2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

interface ShareableLinkProps {
  barbershopId: string;
  currentSlug: string;
  barbershopName: string;
}

export const ShareableLink = ({ barbershopId, currentSlug, barbershopName }: ShareableLinkProps) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newSlug, setNewSlug] = useState(currentSlug);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const baseUrl = window.location.origin;
  const fullUrl = `${baseUrl}/b/${currentSlug}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar link");
    }
  };

  const handleSlugChange = (value: string) => {
    // Normalizar: lowercase, sem acentos, sem caracteres especiais
    const normalized = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    setNewSlug(normalized);
  };

  const saveNewSlug = async () => {
    if (!newSlug || newSlug === currentSlug) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      // Verificar se o slug já existe
      const { data: existing } = await supabase
        .from("barbershops")
        .select("id")
        .eq("slug", newSlug)
        .neq("id", barbershopId)
        .maybeSingle();

      if (existing) {
        toast.error("Este link já está em uso. Escolha outro.");
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from("barbershops")
        .update({ slug: newSlug })
        .eq("id", barbershopId);

      if (error) throw error;

      toast.success("Link atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["barbershop"] });
      queryClient.invalidateQueries({ queryKey: ["barbershop-context"] });
      queryClient.invalidateQueries({ queryKey: ["barbershop-by-slug"] });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar link");
    } finally {
      setIsSaving(false);
    }
  };

  const shareToInstagram = () => {
    const text = encodeURIComponent(`Agende seu horário na ${barbershopName}! 💈\n${fullUrl}`);
    window.open(`https://www.instagram.com/`, "_blank");
    navigator.clipboard.writeText(`Agende seu horário na ${barbershopName}! 💈\n${fullUrl}`);
    toast.info("Texto copiado! Cole na sua bio ou stories do Instagram.");
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`Agende seu horário na ${barbershopName}! 💈\n${fullUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-primary" />
          Link da sua Barbearia
        </CardTitle>
        <CardDescription>
          Compartilhe este link com seus clientes para que possam acessar sua página e fazer agendamentos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Display */}
        <div className="space-y-2">
          <Label>Seu link exclusivo</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-muted rounded-md overflow-hidden">
              <span className="px-3 py-2 text-sm text-muted-foreground bg-muted-foreground/10 border-r border-border">
                {baseUrl}/b/
              </span>
              {isEditing ? (
                <Input
                  value={newSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="border-0 focus-visible:ring-0 bg-transparent"
                  placeholder="seu-link"
                />
              ) : (
                <span className="px-3 py-2 text-sm font-medium">{currentSlug}</span>
              )}
            </div>
            {isEditing ? (
              <Button onClick={saveNewSlug} disabled={isSaving} size="icon">
                <Save className="w-4 h-4" />
              </Button>
            ) : (
              <>
                <Button onClick={() => setIsEditing(true)} variant="outline" size="icon">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button onClick={copyToClipboard} variant="default" size="icon">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Full URL Preview */}
        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm font-mono break-all">{fullUrl}</p>
        </div>

        {/* Share Buttons */}
        <div className="space-y-2">
          <Label>Compartilhar</Label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={shareToInstagram} variant="outline" className="flex items-center gap-2">
              <Instagram className="w-4 h-4" />
              Instagram
            </Button>
            <Button onClick={shareToWhatsApp} variant="outline" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button onClick={copyToClipboard} variant="outline" className="flex items-center gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Copiar Link
            </Button>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-4 p-4 bg-primary/10 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">💡 Dicas de uso</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Coloque o link na bio do seu Instagram</li>
            <li>• Compartilhe nos stories e posts</li>
            <li>• Envie para clientes via WhatsApp</li>
            <li>• Use em materiais promocionais</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
