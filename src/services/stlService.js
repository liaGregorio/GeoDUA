import { api, API_BASE_URL } from './api';

/**
 * Serviço para gerenciar arquivos STL
 */

/**
 * Extrai o ID do arquivo do Google Drive de uma URL
 * @param {string} url - URL do Google Drive
 * @returns {string|null} - ID do arquivo ou null se não for válido
 */
export const extractGoogleDriveFileId = (url) => {
  if (!url) return null;
  
  // Suporta vários formatos de URL do Google Drive
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,  // https://drive.google.com/file/d/FILE_ID
    /id=([a-zA-Z0-9_-]+)/,          // https://drive.google.com/uc?id=FILE_ID
    /^([a-zA-Z0-9_-]+)$/             // Apenas o ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

/**
 * Obtém a URL do proxy para carregar um arquivo STL
 * @param {string} googleDriveUrl - URL do Google Drive
 * @returns {string|null} - URL do proxy ou null se inválida
 */
export const getSTLProxyUrl = (googleDriveUrl) => {
  const fileId = extractGoogleDriveFileId(googleDriveUrl);
  if (!fileId) return null;
  
  return `${API_BASE_URL}/stl-proxy/${fileId}`;
};

/**
 * Carrega um arquivo STL através do proxy
 * @param {string} googleDriveUrl - URL do Google Drive
 * @returns {Promise<ArrayBuffer>} - Buffer do arquivo STL
 */
export const loadSTLFile = async (googleDriveUrl) => {
  
  try {
    const fileId = extractGoogleDriveFileId(googleDriveUrl);
    
    if (!fileId) {
      throw new Error('URL do Google Drive inválida');
    }
    
    const endpoint = `/stl-proxy/${fileId}`;
    
    // Usa api.get que já inclui autenticação e headers corretos
    const response = await api.get(endpoint, {
      responseType: 'arraybuffer'
    });
    
    return response.data;
  } catch (error) {
    console.error('[STL Service] Erro ao carregar arquivo STL:', error);
    console.error('[STL Service] Detalhes do erro:', {
      message: error.message,
      response: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
};

/**
 * Valida se uma URL é um link válido do Google Drive
 * @param {string} url - URL para validar
 * @returns {boolean} - true se for válida
 */
export const isValidGoogleDriveUrl = (url) => {
  return extractGoogleDriveFileId(url) !== null;
};
