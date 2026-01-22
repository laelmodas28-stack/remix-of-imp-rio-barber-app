import { Video, Play, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type TutorialVideo = Tables<"tutorial_videos">;

interface GroupedCategory {
  id: string;
  title: string;
  icon: string;
  videos: TutorialVideo[];
}

const VideoCard = ({ video }: { video: TutorialVideo }) => {
  const handlePlayVideo = () => {
    if (video.video_url) {
      window.open(video.video_url, "_blank");
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-all ${
        video.video_url ? "cursor-pointer" : "cursor-default opacity-70"
      } group`}
      onClick={handlePlayVideo}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Play className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-foreground truncate">
          {video.title}
        </h4>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {video.description || "Sem descrição"}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {video.video_url && (
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </div>
    </div>
  );
};

export const VideoTutorials = () => {
  const { barbershop } = useBarbershopContext();
  const { isAdmin } = useUserRole(barbershop?.id);

  const { data: videos } = useQuery({
    queryKey: ["tutorial-videos-view", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      
      const { data, error } = await supabase
        .from("tutorial_videos")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true)
        .order("order_index");
      
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id && isAdmin,
  });

  // Só exibe para administradores
  if (!isAdmin) {
    return null;
  }

  // Group videos by a simple category based on title prefix or just show all
  const categories: GroupedCategory[] = [];
  const defaultCategory: GroupedCategory = {
    id: "default",
    title: "Tutoriais",
    icon: "🎬",
    videos: videos || [],
  };
  
  if (videos && videos.length > 0) {
    categories.push(defaultCategory);
  }

  const totalVideos = videos?.length || 0;

  if (totalVideos === 0) {
    return null; // Não mostra o botão se não houver vídeos
  }

  return (
    <TooltipProvider>
      <Sheet>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Video className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tutoriais da Plataforma</p>
          </TooltipContent>
        </Tooltip>

        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader className="space-y-3 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-left">Tutoriais em Vídeo</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {totalVideos} vídeo{totalVideos !== 1 ? "s" : ""} • Aprenda a usar a plataforma
                </p>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-140px)] mt-4 pr-4">
            <Accordion type="single" collapsible className="space-y-2">
              {categories.map((category) => (
                <AccordionItem
                  key={category.id}
                  value={category.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{category.icon}</span>
                      <div className="text-left">
                        <span className="font-medium">{category.title}</span>
                        <p className="text-xs text-muted-foreground font-normal">
                          {category.videos.length} vídeo
                          {category.videos.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-2">
                      {category.videos.map((video) => (
                        <VideoCard key={video.id} video={video} />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
};
