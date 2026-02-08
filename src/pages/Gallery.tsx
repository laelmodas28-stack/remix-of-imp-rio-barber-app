import { useState } from "react";
import Header from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ImageIcon, Loader2 } from "lucide-react";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";

const Gallery = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { barbershop, isLoading: isBarbershopLoading } = useBarbershopContext();

  const { data: gallery, isLoading } = useQuery({
    queryKey: ["gallery", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      
      const { data, error } = await supabase
        .from("gallery")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("display_order");
      
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="text-center mb-6 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4">Nossa Galeria</h1>
          <p className="text-muted-foreground text-sm sm:text-lg">
            Confira alguns dos nossos melhores trabalhos
          </p>
          {barbershop && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Galeria de: <span className="font-semibold text-primary">{barbershop.name}</span>
            </p>
          )}
        </div>

        {isBarbershopLoading || isLoading || !barbershop ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : gallery && gallery.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {gallery.map((item) => (
              <Card
                key={item.id}
                className="border-border overflow-hidden cursor-pointer hover:shadow-gold transition-all group active:scale-95"
                onClick={() => setSelectedImage(item.image_url)}
              >
                <div className="aspect-square relative">
                  <img
                    src={item.image_url}
                    alt={item.title || item.description || "Trabalho da barbearia"}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  {item.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 sm:p-3">
                      <p className="text-white text-xs sm:text-sm font-medium truncate">{item.title}</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ImageIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-sm sm:text-base text-muted-foreground">
              Em breve teremos fotos dos nossos trabalhos aqui
            </p>
          </div>
        )}
      </div>

      {/* Modal de Imagem Ampliada */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl p-0 bg-transparent border-0">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute -top-10 right-0 sm:right-0 p-2 rounded-full bg-background/80 hover:bg-background transition-colors z-50"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Imagem ampliada"
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Gallery;
