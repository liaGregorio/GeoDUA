import { api } from './api';

/**
 * Buscar áudios de um capítulo
 */
export const getAudiosByCapitulo = async (capituloId) => {
  try {
    const response = await api.get(`/audios/capitulo/${capituloId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar áudios:', error);
    throw error;
  }
};

/**
 * Buscar um áudio por ID
 */
export const getAudioById = async (audioId) => {
  try {
    const response = await api.get(`/audios/${audioId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar áudio:', error);
    throw error;
  }
};

/**
 * Criar um novo áudio
 */
export const createAudio = async (audioData) => {
  try {
    const response = await api.post('/audios', audioData);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar áudio:', error);
    throw error;
  }
};

/**
 * Atualizar um áudio
 */
export const updateAudio = async (audioId, audioData) => {
  try {
    const response = await api.put(`/audios/${audioId}`, audioData);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar áudio:', error);
    throw error;
  }
};

/**
 * Deletar um áudio
 */
export const deleteAudio = async (audioId) => {
  try {
    const response = await api.delete(`/audios/${audioId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar áudio:', error);
    throw error;
  }
};
