import { apiClient } from './api.js';

// Função para criar um novo livro
export const createBook = async (nome) => {
  try {
    const data = await apiClient.post('/livros', { nome });
    return data;
  } catch (error) {
    console.error('Erro ao criar livro:', error);
    throw error;
  }
};

// Função para buscar livros
export const getBooks = async () => {
  try {
    const result = await apiClient.get('/livros');
    
    // Se a API retorna um objeto com 'data', extrair o array
    if (result.data && Array.isArray(result.data)) {
      return result.data;
    }
    
    // Se retorna diretamente um array
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Erro ao buscar livros:', error);
    throw error;
  }
};

// Função para atualizar um livro
export const updateBook = async (id, nome) => {
  try {
    const data = await apiClient.put(`/livros/${id}`, { nome });
    return data;
  } catch (error) {
    console.error('Erro ao atualizar livro:', error);
    throw error;
  }
};

// Função para deletar um livro
export const deleteBook = async (id) => {
  try {
    const data = await apiClient.delete(`/livros/${id}`);
    return data;
  } catch (error) {
    console.error('Erro ao deletar livro:', error);
    throw error;
  }
};

// Função para buscar um livro por ID
export const getBookById = async (id) => {
  try {
    const result = await apiClient.get(`/livros/${id}`);
    
    // Se a API retorna um objeto com 'data', extrair
    if (result.data) {
      return result.data;
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao buscar livro:', error);
    throw error;
  }
};
