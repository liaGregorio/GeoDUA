import { api } from './api';

export const authService = {
  async login(email, senha) {
    try {
      const response = await api.post('/usuarios/login', {
        email,
        senha
      });
      
      return response.data;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Erro ao fazer login. Verifique suas credenciais.');
    }
  },

  async register(userData) {
    try {
      const response = await api.post('/usuarios/registro', userData);
      
      return response.data;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Erro ao criar conta. Tente novamente.');
    }
  },

  async getProfile(token) {
    try {
      const response = await api.get('/usuarios/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Erro ao carregar perfil do usuário.');
    }
  }
};
