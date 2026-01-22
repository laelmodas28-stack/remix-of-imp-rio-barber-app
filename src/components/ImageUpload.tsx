import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { 
  validateImageFile, 
  createImagePreview, 
  revokeImagePreview,
  resizeImage 
} from "@/lib/imageUtils";

interface ImageUploadProps {
  label?: string;
  currentImageUrl?: string | null;
  onImageSelect: (file: File) => void;
  onImageRemove?: () => void;
  maxSizeMB?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: "square" | "landscape" | "portrait";
  disabled?: boolean;
  className?: string;
}

const ImageUpload = ({
  label = "Upload de Imagem",
  currentImageUrl,
  onImageSelect,
  onImageRemove,
  maxSizeMB = 5,
  maxWidth = 1200,
  maxHeight = 1200,
  aspectRatio = "square",
  disabled = false,
  className = "",
}: ImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Cleanup preview URL on unmount
    return () => {
      if (preview) {
        revokeImagePreview(preview);
      }
    };
  }, [preview]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar arquivo
    const validation = validateImageFile(file, maxSizeMB);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsProcessing(true);

    try {
      // Criar preview
      const previewUrl = createImagePreview(file);
      setPreview(previewUrl);

      // Redimensionar imagem
      const resizedFile = await resizeImage(file, maxWidth, maxHeight);
      
      // Chamar callback com arquivo redimensionado
      onImageSelect(resizedFile);

      toast.success("Imagem selecionada com sucesso!");
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      toast.error("Erro ao processar imagem");
    } finally {
      setIsProcessing(false);
      // Limpar input para permitir selecionar o mesmo arquivo novamente
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    if (preview) {
      revokeImagePreview(preview);
      setPreview(null);
    }
    if (onImageRemove) {
      onImageRemove();
    }
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "square":
        return "aspect-square";
      case "landscape":
        return "aspect-video";
      case "portrait":
        return "aspect-[3/4]";
      default:
        return "aspect-square";
    }
  };

  const displayImage = preview || currentImageUrl;

  return (
    <div className={`space-y-3 ${className}`}>
      {label && <Label>{label}</Label>}
      
      <div className="space-y-3">
        {/* Preview */}
        {displayImage && (
          <div className="relative">
            <div className={`w-full ${getAspectRatioClass()} rounded-lg border border-border overflow-hidden bg-card`}>
              <img
                src={displayImage}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            {!disabled && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemove}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Upload Button */}
        {!displayImage && (
          <div 
            className={`w-full ${getAspectRatioClass()} rounded-lg border-2 border-dashed border-border bg-card/50 flex flex-col items-center justify-center gap-3 hover:bg-card/80 transition-colors cursor-pointer`}
            onClick={() => inputRef.current?.click()}
          >
            <ImageIcon className="w-12 h-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center px-4">
              Clique para selecionar uma imagem
            </p>
          </div>
        )}

        {/* Hidden Input */}
        <Input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || isProcessing}
        />

        {/* Upload/Change Button */}
        {displayImage && !disabled && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => inputRef.current?.click()}
            disabled={isProcessing}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isProcessing ? "Processando..." : "Alterar Imagem"}
          </Button>
        )}

        {/* Info Text */}
        <p className="text-xs text-muted-foreground text-center">
          Formatos aceitos: JPG, JPEG, PNG • Máx: {maxSizeMB}MB
        </p>
      </div>
    </div>
  );
};

export default ImageUpload;
