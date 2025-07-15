import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Register() {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    isProfessor: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const { register } = useAuth();
  const navigate = useNavigate();

  // Aplicar o modo dark no body quando o componente montar
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Salvar a preferência no localStorage
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
    
    // Aplicar a classe no body
    if (newDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem');
      return;
    }

    if (formData.senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const userData = {
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
        id_usuarios_tipos: formData.isProfessor ? 2 : 3 // 2 para professor, 3 para aluno
      };

      await register(userData);
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page register-page">
      {/* Header */}
      <header className="auth-navbar">
        <div className="auth-navbar-content">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <img src="/logo.png" alt="GeoDUA Logo" className="logo-image" />
            <span className="logo-text">GeoDUA</span>
          </div>
          <button className="icon-button" onClick={toggleDarkMode}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="auth-main">
        <div className="auth-card register-card">
          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <input
                type="text"
                name="nome"
                placeholder="Nome completo"
                value={formData.nome}
                onChange={handleChange}
                required
                className="auth-input"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="E-mail"
                value={formData.email}
                onChange={handleChange}
                required
                className="auth-input"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  name="senha"
                  placeholder="Senha"
                  value={formData.senha}
                  onChange={handleChange}
                  required
                  className="auth-input"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <div className="password-field">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmarSenha"
                  placeholder="Confirme sua senha"
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  required
                  className="auth-input"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={toggleConfirmPasswordVisibility}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isProfessor"
                  checked={formData.isProfessor}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="checkbox-input"
                />
                Sou professor
              </label>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="auth-button primary"
              disabled={isLoading}
            >
              {isLoading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>

          {/* Footer */}
          <div className="auth-footer">
            <p>
              Já tem uma conta? <Link to="/login">Faça login</Link>
            </p>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="auth-copyright">
        Copyright © 2025 - Todos os direitos reservados.
      </footer>
    </div>
  );
}

export default Register;
