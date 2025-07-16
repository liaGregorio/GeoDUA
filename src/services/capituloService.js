import { api } from './api';

// Listar capítulos de um livro específico
export const getCapitulos = async (idLivro) => {
  try {
    const response = await api.get(`/capitulos/livro/${idLivro}`);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao buscar capítulos:', error);
    throw new Error(error.response?.data?.message || 'Erro ao buscar capítulos');
  }
};

// Buscar capítulo por ID
export const getCapituloById = async (id) => {
  try {
    const response = await api.get(`/capitulos/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao buscar capítulo:', error);
    throw new Error(error.response?.data?.message || 'Erro ao buscar capítulo');
  }
};

// Criar novo capítulo
export const createCapitulo = async (nome, idLivro, idUsuario) => {
  try {
    const response = await api.post('/capitulos', {
      nome,
      id_livro: idLivro,
      id_usuario: idUsuario
    });
    return response.data.data;
  } catch (error) {
    console.error('Erro ao criar capítulo:', error);
    throw new Error(error.response?.data?.message || 'Erro ao criar capítulo');
  }
};

// Atualizar capítulo
export const updateCapitulo = async (id, nome) => {
  try {
    const response = await api.put(`/capitulos/${id}`, {
      nome
    });
    return response.data.data;
  } catch (error) {
    console.error('Erro ao atualizar capítulo:', error);
    throw new Error(error.response?.data?.message || 'Erro ao atualizar capítulo');
  }
};

// Deletar capítulo
export const deleteCapitulo = async (id) => {
  try {
    const response = await api.delete(`/capitulos/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar capítulo:', error);
    throw new Error(error.response?.data?.message || 'Erro ao deletar capítulo');
  }
};

// Buscar rascunhos de um usuário
export const getRascunhosByUsuario = async (idUsuario) => {
  try {
    const response = await api.get(`/capitulos/rascunhos/usuario/${idUsuario}`);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao buscar rascunhos:', error);
    throw new Error(error.response?.data?.message || 'Erro ao buscar rascunhos');
  }
};

// Criar rascunho
export const createRascunho = async (idUsuario, idCapituloOriginal, nome) => {
  try {
    const response = await api.post('/capitulos/rascunhos', {
      id_usuario: idUsuario,
      id_capitulo_original: idCapituloOriginal,
      nome
    });
    return response.data.data;
  } catch (error) {
    console.error('Erro ao criar rascunho:', error);
    throw new Error(error.response?.data?.message || 'Erro ao criar rascunho');
  }
};
