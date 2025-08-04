import { useState } from 'react';

// Função para comprimir imagem
const compressImage = (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calcular novas dimensões mantendo proporção
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Desenhar imagem redimensionada
      ctx.drawImage(img, 0, 0, width, height);
      
      // Converter para blob
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Função para validar arquivo de imagem
const validateImageFile = (file) => {
  const errors = [];
  
  // Verificar se é uma imagem
  if (!file.type.startsWith('image/')) {
    errors.push('Arquivo deve ser uma imagem');
  }
  
  // Verificar tamanho máximo (10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    errors.push('Arquivo muito grande (máximo 10MB)');
  }
  
  // Verificar tipos permitidos
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Tipo de arquivo não suportado. Use JPEG, PNG, GIF ou WebP');
  }
  
  return errors;
};

export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  
  const processImage = async (file) => {
    try {
      setUploading(true);
      setError(null);
      
      // Validar arquivo
      const validationErrors = validateImageFile(file);
      if (validationErrors.length > 0) {
        console.error('❌ Erro de validação:', validationErrors);
        throw new Error(validationErrors.join(', '));
      }

      
      // Comprimir imagem
      const compressedFile = await compressImage(file);
      
      // Converter para array de bytes
      const { fileToBytea } = await import('../services/imagemService');
      const byteaContent = await fileToBytea(compressedFile);
      
      const result = {
        conteudo: Array.from(byteaContent),
        content_type: 'image/jpeg',
        originalName: file.name,
        originalSize: file.size,
        compressedSize: compressedFile.size
      };
      
      return result;
      
    } catch (err) {
      console.error('❌ Erro no processamento da imagem:', err);
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };
  
  const clearError = () => setError(null);
  
  return {
    processImage,
    uploading,
    error,
    clearError
  };
};
