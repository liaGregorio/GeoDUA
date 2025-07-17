// Utilitários para processamento de imagens

// Converter array de bytes para base64
export const arrayBufferToBase64 = (buffer) => {
  if (typeof buffer === 'string') {
    return buffer; // já é base64
  }
  
  if (buffer instanceof ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    return btoa(String.fromCharCode(...bytes));
  }
  
  if (Array.isArray(buffer)) {
    const bytes = new Uint8Array(buffer);
    
    // Para arrays grandes, processar em chunks para evitar stack overflow
    if (bytes.length > 65536) {
      let result = '';
      for (let i = 0; i < bytes.length; i += 65536) {
        const chunk = bytes.slice(i, i + 65536);
        result += String.fromCharCode(...chunk);
      }
      return btoa(result);
    } else {
      return btoa(String.fromCharCode(...bytes));
    }
  }
  
  throw new Error('Formato de buffer não suportado');
};

// Converter base64 para array de bytes
export const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Validar se uma string é base64 válida
export const isValidBase64 = (str) => {
  try {
    return btoa(atob(str)) === str;
  } catch (err) {
    return false;
  }
};

// Processar dados de imagem para exibição
export const processImageData = (imagem) => {
  if (!imagem || !imagem.conteudo) {
    return null;
  }
  
  let base64Content;
  
  try {
    // Verificar se o conteúdo é um Buffer object do Node.js
    if (imagem.conteudo && typeof imagem.conteudo === 'object' && imagem.conteudo.type === 'Buffer') {
      if (imagem.conteudo.data && Array.isArray(imagem.conteudo.data)) {
        base64Content = arrayBufferToBase64(imagem.conteudo.data);
      } else {
        return null;
      }
    } else if (typeof imagem.conteudo === 'string') {
      // Verificar se já é base64 válido
      if (isValidBase64(imagem.conteudo)) {
        base64Content = imagem.conteudo;
      } else {
        base64Content = btoa(imagem.conteudo);
      }
    } else if (Array.isArray(imagem.conteudo)) {
      base64Content = arrayBufferToBase64(imagem.conteudo);
    } else if (imagem.conteudo instanceof ArrayBuffer) {
      base64Content = arrayBufferToBase64(imagem.conteudo);
    } else {
      return null;
    }
    
    // Verificar se o base64 gerado é válido
    if (!base64Content || base64Content.length === 0) {
      return null;
    }
    
    const contentType = imagem.content_type || 'image/jpeg';
    const src = `data:${contentType};base64,${base64Content}`;
    
    const result = {
      src,
      id: imagem.id,
      descricao: imagem.descricao,
      ordem: imagem.ordem
    };
    
    return result;
    
  } catch (error) {
    console.error('Erro ao processar dados da imagem:', error);
    return null;
  }
};
