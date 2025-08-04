import { api } from './api.js';

// Buscar todas as imagens de uma seção
export const getImagens = async (idSecao) => {
  try {
    const response = await api.get(`/imagens/secao/${idSecao}`);

    const imagensData = response.data.data || response.data;
    
    // Garantir que sempre retorne um array
    return Array.isArray(imagensData) ? imagensData : [];
  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    
    // Se não encontrar imagens (404), retornar array vazio
    if (error.response?.status === 404) {
      return [];
    }
    throw new Error(error.response?.data?.error || 'Erro ao buscar imagens');
  }
};

// Buscar uma imagem por ID
export const getImagem = async (id) => {
  try {
    const response = await api.get(`/imagens/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar imagem:', error);
    throw new Error(error.response?.data?.error || 'Erro ao buscar imagem');
  }
};

// Criar nova imagem
export const createImagem = async (dadosImagem) => {
  try {
    
    // Se há um arquivo, converter para bytea
    if (dadosImagem.arquivo) {
      const byteaArray = await fileToBytea(dadosImagem.arquivo);
      dadosImagem.conteudo = Array.from(byteaArray);
      dadosImagem.content_type = dadosImagem.arquivo.type;
      delete dadosImagem.arquivo; // Remover o arquivo depois de processar
    }
    
    const response = await api.post('/imagens', dadosImagem);
    return response.data.data;
  } catch (error) {
    console.error('❌ Erro ao criar imagem:', error);
    console.error('❌ Status:', error.response?.status);
    console.error('❌ Dados do erro:', error.response?.data);
    throw error;
  }
};

// Atualizar imagem existente
export const updateImagem = async (id, dadosImagem) => {
  try {
    // Converter arquivo para bytea se necessário
    if (dadosImagem.arquivo) {
      const byteaArray = await fileToBytea(dadosImagem.arquivo);
      dadosImagem.arquivo = Array.from(byteaArray);
    }
    
    const response = await api.put(`/imagens/${id}`, dadosImagem);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao atualizar imagem:', error);
    throw error;
  }
};

// Deletar uma imagem
export const deleteImagem = async (id) => {
  try {
    const response = await api.delete(`/imagens/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    throw new Error(error.response?.data?.error || 'Erro ao deletar imagem');
  }
};

// Função para converter arquivo para bytea
export const fileToBytea = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Converter ArrayBuffer para Uint8Array
      const uint8Array = new Uint8Array(reader.result);
      resolve(uint8Array);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
