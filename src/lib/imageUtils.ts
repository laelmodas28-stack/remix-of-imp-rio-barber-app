/**
 * Redimensiona uma imagem mantendo a proporção
 * @param file Arquivo de imagem original
 * @param maxWidth Largura máxima
 * @param maxHeight Altura máxima
 * @param quality Qualidade da compressão (0-1)
 * @returns Promise com o arquivo redimensionado
 */
export const resizeImage = async (
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.85
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Não foi possível criar contexto do canvas'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Calcular novas dimensões mantendo a proporção
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Desenhar imagem redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // Converter para blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Erro ao converter imagem'));
            return;
          }

          // Criar novo arquivo com o blob
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });

          resolve(resizedFile);
        },
        file.type,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Erro ao carregar imagem'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Valida se o arquivo é uma imagem válida
 * @param file Arquivo a ser validado
 * @param maxSizeMB Tamanho máximo em MB
 * @returns Objeto com status da validação
 */
export const validateImageFile = (
  file: File,
  maxSizeMB: number = 5
): { valid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato não suportado. Use apenas JPG, JPEG ou PNG.',
    };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB.`,
    };
  }

  return { valid: true };
};

/**
 * Cria uma URL de preview para um arquivo
 * @param file Arquivo de imagem
 * @returns URL de preview
 */
export const createImagePreview = (file: File): string => {
  return URL.createObjectURL(file);
};

/**
 * Libera URL de preview da memória
 * @param url URL de preview
 */
export const revokeImagePreview = (url: string): void => {
  URL.revokeObjectURL(url);
};
