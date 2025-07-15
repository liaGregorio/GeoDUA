import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Verificar se há token salvo e validar
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Erro ao recuperar dados do usuário:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email, senha) => {
    try {
      const response = await authService.login(email, senha);
      
      if (response.success) {
        const { token, usuario } = response.data;
        
        setToken(token);
        setUser(usuario);
        
        // Salvar no localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(usuario));
        
        return response;
      } else {
        throw new Error(response.message || 'Erro ao fazer login');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      
      if (response.success) {
        return response;
      } else {
        throw new Error(response.message || 'Erro ao criar conta');
      }
    } catch (error) {
      console.error('Erro no registro:', error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
