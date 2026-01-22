import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Video, GripVertical, Upload, Link, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type TutorialVideo = Tables<"tutorial_videos">;

interface VideoTutorialManagerProps {
  barbershopId: string;
}

export const VideoTutorialManager = ({ barbershopId }: VideoTutorialManagerProps) => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TutorialVideo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [videoSource, setVideoSource] = useState<"upload" | "url">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [categoryId, setCategoryId] = useState("general");
  const [categoryTitle, setCategoryTitle] = useState("Geral");

  const { data: videos, isLoading } = useQuery({
    queryKey: ["tutorial-videos", barbershopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutorial_videos")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .order("display_order");
      
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (videoData: Partial<TutorialVideo>) => {
      if (editingVideo) {
        const { error } = await supabase
          .from("tutorial_videos")
          .update({
            title: videoData.title,
            description: videoData.description,
            video_url: videoData.video_url,
            is_active: videoData.is_active,
            display_order: videoData.display_order,
            category_id: videoData.category_id,
            category_title: videoData.category_title,
          })
          .eq("id", editingVideo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tutorial_videos")
          .insert({
            barbershop_id: barbershopId,
            title: videoData.title!,
            description: videoData.description,
            video_url: videoData.video_url!,
            is_active: videoData.is_active,
            display_order: videoData.display_order,
            category_id: videoData.category_id || "general",
            category_title: videoData.category_title || "Geral",
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingVideo ? "Vídeo atualizado!" : "Vídeo adicionado!");
      queryClient.invalidateQueries({ queryKey: ["tutorial-videos", barbershopId] });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao salvar vídeo: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase
        .from("tutorial_videos")
        .delete()
        .eq("id", videoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vídeo removido!");
      queryClient.invalidateQueries({ queryKey: ["tutorial-videos", barbershopId] });
    },
    onError: (error) => {
      toast.error("Erro ao remover vídeo: " + error.message);
    },
  });

  const resetForm = () => {
    setEditingVideo(null);
    setTitle("");
    setDescription("");
    setVideoUrl("");
    setIsActive(true);
    setVideoSource("upload");
    setCategoryId("general");
    setCategoryTitle("Geral");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato de vídeo inválido. Use MP4, WebM, MOV ou AVI.");
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Vídeo muito grande. Máximo 100MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${barbershopId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('tutorial-videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tutorial-videos')
        .getPublicUrl(fileName);

      setVideoUrl(publicUrl);
      toast.success("Vídeo enviado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao enviar vídeo: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (video: TutorialVideo) => {
    setEditingVideo(video);
    setTitle(video.title);
    setDescription(video.description || "");
    setVideoUrl(video.video_url || "");
    setIsActive(video.is_active ?? true);
    setCategoryId(video.category_id || "general");
    setCategoryTitle(video.category_title || "Geral");
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) {
      toast.error("Preencha o título");
      return;
    }

    saveMutation.mutate({
      title,
      description: description || null,
      video_url: videoUrl || null,
      is_active: isActive,
      display_order: videos?.length || 0,
      category_id: categoryId,
      category_title: categoryTitle,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Tutoriais em Vídeo
          </h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os vídeos tutoriais que aparecem para os administradores
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Vídeo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingVideo ? "Editar Vídeo" : "Adicionar Vídeo Tutorial"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Como criar um agendamento"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição do conteúdo do vídeo"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Vídeo</Label>
                <Tabs value={videoSource} onValueChange={(v) => setVideoSource(v as "upload" | "url")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" className="text-xs">
                      <Upload className="h-3 w-3 mr-1" />
                      Enviar
                    </TabsTrigger>
                    <TabsTrigger value="url" className="text-xs">
                      <Link className="h-3 w-3 mr-1" />
                      URL
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload" className="mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : videoUrl && videoSource === "upload" ? (
                        <>
                          <Video className="h-4 w-4 mr-2" />
                          Trocar vídeo
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Selecionar vídeo
                        </>
                      )}
                    </Button>
                    {videoUrl && videoSource === "upload" && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        ✓ Vídeo selecionado
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      MP4, WebM, MOV ou AVI (máx. 100MB)
                    </p>
                  </TabsContent>
                  <TabsContent value="url" className="mt-2">
                    <Input
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      YouTube, Vimeo ou link direto
                    </p>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : !videos?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum vídeo tutorial cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Clique em "Adicionar Vídeo" para começar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {videos.map((video) => (
            <Card key={video.id}>
              <CardContent className="p-4">
                <div
                  className={`flex items-center gap-3 ${
                    video.is_active ? "" : "opacity-60"
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{video.title}</p>
                    {video.description && (
                      <p className="text-xs text-muted-foreground truncate">{video.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(video)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Remover este vídeo?")) {
                          deleteMutation.mutate(video.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};