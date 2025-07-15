import axios from 'axios';

// Configuração da API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

// Criar instância do axios
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'X-API-Key': API_KEY }),
  },
});

// Interceptador para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptador para lidar com respostas de erro
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Cliente HTTP básico (mantido para compatibilidade)
export const apiClient = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'X-API-Key': API_KEY }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Tratamento específico para erros de autenticação
        if (response.status === 401) {
          throw new Error('Não autorizado - verifique a API Key');
        }
        if (response.status === 403) {
          throw new Error('Acesso negado - API Key inválida');
        }
        throw new Error(`Erro na API: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro na requisição:', error);
      throw error;
    }
  },

  // Métodos HTTP
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};

// Exportar a URL base para casos específicos
export { API_BASE_URL };
