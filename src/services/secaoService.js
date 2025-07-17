import { api } from './api.js';

// Buscar todas as seções de um capítulo
export const getSecoes = async (idCapitulo) => {
  try {
    const response = await api.get(`/secoes/capitulo/${idCapitulo}`);
    
    const secoesData = response.data?.data || response.data;
    
    // Garantir que sempre retorne um array
    return Array.isArray(secoesData) ? secoesData : [];
  } catch (error) {
    console.error('Erro ao buscar seções:', error);
    // Se não encontrar seções (404), retornar array vazio
    if (error.response?.status === 404) {
      return [];
    }
    throw new Error(error.response?.data?.error || 'Erro ao buscar seções');
  }
};

// Buscar uma seção por ID
export const getSecao = async (id) => {
  try {
    const response = await api.get(`/secoes/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar seção:', error);
    throw new Error(error.response?.data?.error || 'Erro ao buscar seção');
  }
};

// Criar uma nova seção
export const createSecao = async (secaoData) => {
  try {
    const response = await api.post('/secoes', secaoData);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar seção:', error);
    throw new Error(error.response?.data?.error || 'Erro ao criar seção');
  }
};

// Atualizar uma seção
export const updateSecao = async (id, secaoData) => {
  try {
    const response = await api.put(`/secoes/${id}`, secaoData);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar seção:', error);
    throw new Error(error.response?.data?.error || 'Erro ao atualizar seção');
  }
};

// Deletar uma seção
export const deleteSecao = async (id) => {
  try {
    const response = await api.delete(`/secoes/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar seção:', error);
    throw new Error(error.response?.data?.error || 'Erro ao deletar seção');
  }
};
