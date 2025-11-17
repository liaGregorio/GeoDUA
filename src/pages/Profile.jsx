import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import '../styles/profile.css';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [historyItems, setHistoryItems] = useState([]);
  const [stats, setStats] = useState({
    totalVisits: 0,
    booksAccessed: 0,
    chaptersAccessed: 0,
    lastAccess: null
  });
  const [userStats, setUserStats] = useState({
    professores: 0,
    alunos: 0,
    total: 0
  });
  const [loadingUserStats, setLoadingUserStats] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadHistory();
    
    // Carregar estatísticas de usuários se for admin
    if (user.tipoUsuario?.id === 1) {
      loadUserStats();
    }
  }, [user, navigate]);

  const loadHistory = () => {
    try {
      const storageKey = user?.id ? `userHistory_${user.id}` : 'userHistory';
      const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Ordenar por data mais recente
      const sortedHistory = history.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      setHistoryItems(sortedHistory.slice(0, 20)); // Últimos 20 itens

      // Calcular estatísticas
      const uniqueBooks = new Set(history.map(item => item.bookId));
      const uniqueChapters = new Set(history.map(item => item.chapterId));
      const lastItem = sortedHistory[0];

      setStats({
        totalVisits: history.length,
        booksAccessed: uniqueBooks.size,
        chaptersAccessed: uniqueChapters.size,
        lastAccess: lastItem ? lastItem.timestamp : null
      });
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      setLoadingUserStats(true);
      const response = await api.get('/usuarios/contagem');
      if (response.data.success) {
        setUserStats(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas de usuários:', error);
    } finally {
      setLoadingUserStats(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico?')) {
      const storageKey = user?.id ? `userHistory_${user.id}` : 'userHistory';
      localStorage.removeItem(storageKey);
      setHistoryItems([]);
      setStats({
        totalVisits: 0,
        booksAccessed: 0,
        chaptersAccessed: 0,
        lastAccess: null
      });
    }
  };

  const removeHistoryItem = (index) => {
    const storageKey = user?.id ? `userHistory_${user.id}` : 'userHistory';
    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    history.splice(index, 1);
    localStorage.setItem(storageKey, JSON.stringify(history));
    loadHistory();
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} dia${days > 1 ? 's' : ''} atrás`;
    } else if (hours > 0) {
      return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
    } else if (minutes > 0) {
      return `${minutes} minuto${minutes > 1 ? 's' : ''} atrás`;
    } else {
      return 'Agora mesmo';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header do Perfil */}
        <div className="profile-header">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {user.nome?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
          <div className="profile-info">
            <h1>{user.nome || 'Usuário'}</h1>
            <p className="profile-email">{user.email}</p>
            <div className="profile-badges">
              {user.tipoUsuario?.id === 1 ? (
                <span className="badge badge-admin">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
                  </svg>
                  Administrador
                </span>
              ) : (
                <span className="badge">
                  {user.tipoUsuario?.nome || 'Leitor'}
                </span>
              )}
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sair
          </button>
        </div>

        {/* Estatísticas */}
        <div className="profile-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.booksAccessed}</div>
              <div className="stat-label">Livros Acessados</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.chaptersAccessed}</div>
              <div className="stat-label">Capítulos Visitados</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalVisits}</div>
              <div className="stat-label">Total de Visitas</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {stats.lastAccess ? formatDate(stats.lastAccess).split(' ')[0] : '-'}
              </div>
              <div className="stat-label">
                {stats.lastAccess ? formatDate(stats.lastAccess).split(' ').slice(1).join(' ') : 'Sem acessos'}
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Usuários (apenas para admins) */}
        {user.tipoUsuario?.id === 1 && (
          <div className="users-chart-section">
            <div className="chart-header">
              <h2>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Estatísticas de Usuários
              </h2>
            </div>
            
            {loadingUserStats ? (
              <div className="chart-loading">
                <div className="spinner"></div>
                <p>Carregando estatísticas...</p>
              </div>
            ) : (
              <div className="chart-content">
                <div className="chart-bars">
                  <div className="bar-group">
                    <div className="bar-label">Professores</div>
                    <div className="bar-container">
                      <div 
                        className="bar bar-professors"
                        style={{ 
                          width: userStats.total > 0 
                            ? `${(userStats.professores / userStats.total) * 100}%` 
                            : '0%' 
                        }}
                      >
                        <span className="bar-value">{userStats.professores}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bar-group">
                    <div className="bar-label">Alunos</div>
                    <div className="bar-container">
                      <div 
                        className="bar bar-students"
                        style={{ 
                          width: userStats.total > 0 
                            ? `${(userStats.alunos / userStats.total) * 100}%` 
                            : '0%' 
                        }}
                      >
                        <span className="bar-value">{userStats.alunos}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="chart-summary">
                  <div className="summary-item">
                    <div className="summary-icon professors-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                        <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                      </svg>
                    </div>
                    <div className="summary-content">
                      <div className="summary-value">{userStats.professores}</div>
                      <div className="summary-label">Professores</div>
                    </div>
                  </div>
                  
                  <div className="summary-item">
                    <div className="summary-icon students-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </div>
                    <div className="summary-content">
                      <div className="summary-value">{userStats.alunos}</div>
                      <div className="summary-label">Alunos</div>
                    </div>
                  </div>
                  
                  <div className="summary-item">
                    <div className="summary-icon total-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </div>
                    <div className="summary-content">
                      <div className="summary-value">{userStats.total}</div>
                      <div className="summary-label">Total</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Histórico de Navegação */}
        <div className="history-section">
          <div className="history-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18"></path>
                <path d="m19 9-5 5-4-4-5 5"></path>
              </svg>
              Histórico de Navegação
            </h2>
            {historyItems.length > 0 && (
              <button className="btn-clear-history" onClick={clearHistory}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6"></polyline>
                  <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                </svg>
                Limpar Histórico
              </button>
            )}
          </div>

          <div className="history-list">
            {historyItems.length === 0 ? (
              <div className="empty-history">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <p>Nenhum histórico de navegação ainda</p>
                <span>Explore os livros e capítulos para começar!</span>
              </div>
            ) : (
              historyItems.map((item, index) => (
                <div key={index} className="history-item">
                  <div className="history-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                  </div>
                  <div className="history-content">
                    <div className="history-title">{item.bookName}</div>
                    <div className="history-subtitle">
                      {item.chapterName}
                      <span className="history-divider">•</span>
                      <span className="history-time">{formatDate(item.timestamp)}</span>
                    </div>
                  </div>
                  <div className="history-actions">
                    <button 
                      className="btn-history-view"
                      onClick={() => navigate(`/livro/${item.bookId}/capitulo/${item.chapterId}/secoes`)}
                      title="Ver capítulo"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                    <button 
                      className="btn-history-remove"
                      onClick={() => removeHistoryItem(index)}
                      title="Remover do histórico"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
