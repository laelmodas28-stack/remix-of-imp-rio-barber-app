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
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Nossa Galeria</h1>
          <p className="text-muted-foreground text-lg">
            Confira alguns dos nossos melhores trabalhos
          </p>
        </div>

        {isBarbershopLoading || isLoading || !barbershop ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : gallery && gallery.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.map((item) => (
              <Card
                key={item.id}
                className="border-border overflow-hidden cursor-pointer hover:shadow-gold transition-all group"
                onClick={() => setSelectedImage(item.image_url)}
              >
                <div className="aspect-square relative">
                  <img
                    src={item.image_url}
                    alt={item.title || item.description || "Trabalho da barbearia"}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Em breve teremos fotos dos nossos trabalhos aqui
            </p>
          </div>
        )}
      </div>

      {/* Modal de Imagem Ampliada */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-0">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute -top-10 right-0 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Imagem ampliada"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Gallery;
