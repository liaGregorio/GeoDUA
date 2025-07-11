// Configuração da API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api-geodua.onrender.com/api';
const API_KEY = import.meta.env.VITE_API_KEY;

// Validação da API Key
if (!API_KEY) {
  console.error('⚠️  API Key não encontrada! Verifique o arquivo .env');
}

// Cliente HTTP básico
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
