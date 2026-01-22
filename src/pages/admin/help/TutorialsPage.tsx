import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Video, Plus, Play, ExternalLink, Trash2, GripVertical, Loader2, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TutorialVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_TUTORIALS = [
  {
    title: "Primeiros Passos",
    description: "Aprenda a configurar sua barbearia no sistema",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    category: "getting_started",
  },
  {
    title: "Gerenciando Agendamentos",
    description: "Como criar, editar e cancelar agendamentos",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    category: "appointments",
  },
  {
    title: "Cadastro de Serviços",
    description: "Configure os serviços oferecidos pela sua barbearia",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    category: "services",
  },
  {
    title: "Gestão de Profissionais",
    description: "Adicione e gerencie sua equipe de barbeiros",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    category: "team",
  },
  {
    title: "Relatórios e Finanças",
    description: "Acompanhe o desempenho da sua barbearia",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    category: "reports",
  },
  {
    title: "Configurações Avançadas",
    description: "Personalize todas as configurações do sistema",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    category: "settings",
  },
];

export function TutorialsPage() {
  const { barbershop } = useBarbershopContext();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TutorialVideo | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
  });

  const { data: tutorials, isLoading } = useQuery({
    queryKey: ["tutorials", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("tutorial_videos")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as TutorialVideo[];
    },
    enabled: !!barbershop?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!barbershop?.id) throw new Error("Barbearia não encontrada");
      
      if (editingVideo) {
        const { error } = await supabase
          .from("tutorial_videos")
          .update({
            title: formData.title,
            description: formData.description || null,
            video_url: formData.video_url,
            thumbnail_url: formData.thumbnail_url || null,
          })
          .eq("id", editingVideo.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("tutorial_videos")
          .insert({
            barbershop_id: barbershop.id,
            title: formData.title,
            description: formData.description || null,
            video_url: formData.video_url,
            thumbnail_url: formData.thumbnail_url || null,
            order_index: (tutorials?.length || 0) + 1,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingVideo ? "Tutorial atualizado!" : "Tutorial adicionado!");
      queryClient.invalidateQueries({ queryKey: ["tutorials"] });
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar tutorial");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tutorial_videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tutorial removido!");
      queryClient.invalidateQueries({ queryKey: ["tutorials"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover tutorial");
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingVideo(null);
    setFormData({ title: "", description: "", video_url: "", thumbnail_url: "" });
  };

  const openEditDialog = (video: TutorialVideo) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      description: video.description || "",
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || "",
    });
    setIsDialogOpen(true);
  };

  const getYouTubeThumbnail = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.video_url.trim()) {
      toast.error("Título e URL do vídeo são obrigatórios");
      return;
    }
    saveMutation.mutate();
  };

  if (!barbershop?.id) {
    return <AdminPageScaffold title="Tutoriais" subtitle="Aprenda a usar o sistema" icon={Video} />;
  }

  const hasTutorials = tutorials && tutorials.length > 0;

  return (
    <AdminPageScaffold
      title="Tutoriais"
      subtitle="Aprenda a usar todas as funcionalidades do sistema"
      icon={Video}
      actions={
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Tutorial
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Default System Tutorials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Tutoriais do Sistema
            </CardTitle>
            <CardDescription>Aprenda a usar as principais funcionalidades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEFAULT_TUTORIALS.map((tutorial, index) => (
                <Card key={index} className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group">
                  <div className="aspect-video bg-muted relative">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                      <div className="p-3 rounded-full bg-primary/90 text-primary-foreground">
                        <Play className="w-6 h-6" />
                      </div>
                    </div>
                    <img
                      src={getYouTubeThumbnail(tutorial.video_url) || "/placeholder.svg"}
                      alt={tutorial.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1">{tutorial.title}</h3>
                    <p className="text-sm text-muted-foreground">{tutorial.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom Tutorials */}
        <Card>
          <CardHeader>
            <CardTitle>Seus Tutoriais</CardTitle>
            <CardDescription>Tutoriais personalizados para sua equipe</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : hasTutorials ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tutorials.map((video) => (
                  <Card key={video.id} className="overflow-hidden group">
                    <div className="aspect-video bg-muted relative">
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <a
                          href={video.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-full bg-primary/90 text-primary-foreground hover:bg-primary"
                        >
                          <Play className="w-6 h-6" />
                        </a>
                      </div>
                      <img
                        src={video.thumbnail_url || getYouTubeThumbnail(video.video_url) || "/placeholder.svg"}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold mb-1">{video.title}</h3>
                          {video.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(video)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Remover este tutorial?")) {
                                deleteMutation.mutate(video.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-1">Nenhum tutorial personalizado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Adicione vídeos de treinamento para sua equipe
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Tutorial
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVideo ? "Editar Tutorial" : "Adicionar Tutorial"}</DialogTitle>
            <DialogDescription>
              {editingVideo ? "Atualize as informações do tutorial" : "Adicione um novo vídeo de treinamento"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título do tutorial"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Breve descrição do conteúdo..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video_url">URL do Vídeo *</Label>
              <Input
                id="video_url"
                value={formData.video_url}
                onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
              />
              <p className="text-xs text-muted-foreground">
                Suporta YouTube, Vimeo ou qualquer URL de vídeo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail_url">URL da Thumbnail (opcional)</Label>
              <Input
                id="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para usar a thumbnail automática do YouTube
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingVideo ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPageScaffold>
  );
}

export default TutorialsPage;
