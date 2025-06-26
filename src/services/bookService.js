// Serviço da API
const API_BASE_URL = 'https://api-geodua.onrender.com/api';

// Função para criar um novo livro
export const createBook = async (nome) => {
  try {
    const response = await fetch(`${API_BASE_URL}/livros`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nome }),
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao criar livro:', error);
    throw error;
  }
};

// Função para buscar livros
export const getBooks = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/livros`);
    
    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const result = await response.json();
    
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
    const response = await fetch(`${API_BASE_URL}/livros/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nome }),
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao atualizar livro:', error);
    throw error;
  }
};

// Função para deletar um livro
export const deleteBook = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/livros/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao deletar livro:', error);
    throw error;
  }
};
