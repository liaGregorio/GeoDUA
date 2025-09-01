import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    // Recupera a preferência salva ou usa false como padrão
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editMode, setEditMode] = useState(false); // Sempre iniciar como false, será restaurado no useEffect
  const [menuOpen, setMenuOpen] = useState(false);
  const [editModeRestored, setEditModeRestored] = useState(false); // Flag para controlar se já restaurou
  const [shouldSaveEditMode, setShouldSaveEditMode] = useState(false); // Flag para controlar quando salvar

  // Verificar se estamos na página de capítulos ou seções
  const isCapitulosPage = location.pathname.includes('/capitulos');
  const isSecoesPage = location.pathname.includes('/secoes');
  
  // Texto do botão de editar baseado na página atual
  const getEditButtonText = () => {
    if (isSecoesPage) {
      return editMode ? 'Visualizar seções' : 'Editar seções';
    } else if (isCapitulosPage) {
      return editMode ? 'Visualizar capítulos' : 'Editar capítulos';
    } else {
      return editMode ? 'Visualizar livros' : 'Editar livros';
    }
  };

  // Aplicar o modo dark no body quando o componente montar
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Fechar menu quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && !event.target.closest('.menu-container')) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Salvar edit mode no localStorage apenas quando o usuário faz mudanças intencionais
  useEffect(() => {
    // Só salvar se foi autorizado e o usuário já foi carregado
    if (shouldSaveEditMode && user !== null && user !== undefined) {
      localStorage.setItem('editMode', editMode.toString());
      setShouldSaveEditMode(false); // Resetar flag
    }
  }, [editMode, shouldSaveEditMode, user]);

  // Restaurar edit mode do localStorage apenas para admins
  useEffect(() => {
    // Só executar uma vez e se o usuário estiver definido
    if (user !== null && user !== undefined && !editModeRestored) {
      setEditModeRestored(true); // Marcar como já processado
      
      if (user && user.tipoUsuario && user.tipoUsuario.id === 1) {
        const savedEditMode = localStorage.getItem('editMode');
        if (savedEditMode === 'true') {
          setEditMode(true);
          // NÃO ativar shouldSaveEditMode aqui - é só restauração
        }
      } else if (user) {
        // Se for usuário logado mas não admin, garantir que edit mode seja false
        setEditMode(false);
      }
    }
  }, [user, editModeRestored]);

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

  const handleLogout = () => {
    // Limpar edit mode e resetar flags ao fazer logout
    setEditMode(false);
    setEditModeRestored(false);
    setShouldSaveEditMode(false);
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  return (
    <div className={`layout ${darkMode ? 'dark-mode' : ''}`}>
      {/* Header */}
      <header className="header">
        <div className="header-content">
          {/* Logo */}
          <div className="logo">
            <img src="/logo.png" alt="GeoDUA Logo" className="logo-image" />
            <span className="logo-text">GeoDUA</span>
          </div>

          {/* Search */}
          <div className="search-container">
            <input
              type="text"
              placeholder="Pesquisar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button className="search-button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </button>
          </div>

          {/* Actions */}
          <div className="header-actions">
            {/* Dark mode toggle */}
            <button className="icon-button" onClick={toggleDarkMode}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </button>

            {/* User icon */}
            <button 
              className="icon-button"
              onClick={() => {
                if (user) {
                  logout();
                  navigate('/login');
                } else {
                  navigate('/login');
                }
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>

            {/* Menu dots */}
            <div className="menu-container">
              <button className="icon-button" onClick={() => setMenuOpen(!menuOpen)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </button>
              
              {menuOpen && (
                <div className="dropdown-menu">
                  {user ? (
                    <>
                      <div className="dropdown-user-info">
                        <span className="user-name">{(user.nome || user.name) ? (user.nome || user.name).split(' ')[0] : 'Usuário'}</span>
                      </div>
                      {user.tipoUsuario.id === 1 && (
                        <button 
                          className="dropdown-item"
                          onClick={() => {
                            setEditMode(!editMode);
                            setShouldSaveEditMode(true); // Ativar flag para salvar
                            setMenuOpen(false);
                          }}
                        >
                          {getEditButtonText()}
                        </button>
                      )}
                      <button 
                        className="dropdown-item logout-item"
                        onClick={handleLogout}
                      >
                        Sair
                      </button>
                    </>
                  ) : (
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        navigate('/login');
                        setMenuOpen(false);
                      }}
                    >
                      Fazer login
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="main-content">
        <Outlet context={{ searchTerm, editMode, setEditMode }} />
      </main>

      {/* Footer */}
      <footer className="copyright">
        Copyright © 2025 - Todos os direitos reservados.
      </footer>
    </div>
  );
}

export default Layout;
