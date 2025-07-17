import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AddCapituloModal from '../components/AddCapituloModal';
import DeleteCapituloModal from '../components/DeleteCapituloModal';
import { getCapitulos, createCapitulo, updateCapitulo, deleteCapitulo } from '../services/capituloService';
import { getBooks } from '../services/bookService';

const Capitulos = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { editMode, searchTerm } = useOutletContext();
  const [capitulos, setCapitulos] = useState([]);
  const [livro, setLivro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCapitulo, setEditingCapitulo] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, capitulo: null });
  const [deleting, setDeleting] = useState(false);

  // Verificar se o usuário pode gerenciar capítulos
  const canManageCapitulos = user && user.tipoUsuario && user.tipoUsuario.id === 1;

  // Buscar informações do livro
  const fetchLivro = async () => {
    try {
      const books = await getBooks();
      const livroEncontrado = books.find(book => book.id === parseInt(id));
      setLivro(livroEncontrado);
    } catch (err) {
      console.error('Erro ao buscar livro:', err);
    }
  };

  // Buscar capítulos do livro
  const fetchCapitulos = async () => {
    try {
      setLoading(true);
      setError(null);
      const capitulosData = await getCapitulos(id);
      setCapitulos(capitulosData);
    } catch (err) {
      setError(err.message || 'Erro ao carregar capítulos');
      console.error('Erro ao buscar capítulos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivro();
    fetchCapitulos();
  }, [id]);

  // Filtrar capítulos baseado na pesquisa
  const capitulosFiltrados = (capitulos || []).filter(capitulo =>
    capitulo.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCapitulo = async (capituloName) => {
    try {
      await createCapitulo(capituloName, id, user.id);
      await fetchCapitulos();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao adicionar capítulo:', error);
      alert('Erro ao adicionar capítulo. Tente novamente.');
    }
  };

  const handleEditCapitulo = async (capituloName) => {
    try {
      await updateCapitulo(editingCapitulo.id, capituloName);
      await fetchCapitulos();
      setIsModalOpen(false);
      setEditingCapitulo(null);
    } catch (error) {
      console.error('Erro ao editar capítulo:', error);
      alert('Erro ao editar capítulo. Tente novamente.');
    }
  };

  const handleDeleteCapitulo = (capitulo) => {
    setDeleteModal({ isOpen: true, capitulo });
  };

  const confirmDelete = async () => {
    if (!deleteModal.capitulo) return;
    
    try {
      setDeleting(true);
      await deleteCapitulo(deleteModal.capitulo.id);
      await fetchCapitulos();
      setDeleteModal({ isOpen: false, capitulo: null });
    } catch (error) {
      console.error('Erro ao deletar capítulo:', error);
      alert('Erro ao deletar capítulo. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    if (!deleting) {
      setDeleteModal({ isOpen: false, capitulo: null });
    }
  };

  const adicionarCapitulo = () => {
    setIsModalOpen(true);
  };

  const openEditModal = (capitulo) => {
    setEditingCapitulo(capitulo);
    setIsModalOpen(true);
  };

  const handleVoltar = () => {
    navigate('/');
  };

  return (
    <div className="capitulos-container">
      {/* Header com botão voltar */}
      <div className="capitulos-header">
        <button className="voltar-button" onClick={handleVoltar}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5"></path>
            <path d="M12 19l-7-7 7-7"></path>
          </svg>
          Voltar
        </button>
        
        <div className="capitulos-title">
          <h1>Capítulos</h1>
          {livro && <h2>{livro.nome}</h2>}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="loading-message">
          <p>Carregando capítulos...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="error-message">
          <div className="error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <h3>Oops! Algo deu errado</h3>
          <p>{error}</p>
          <p className="error-details">Verifique sua conexão com a internet ou tente novamente em alguns instantes.</p>
          <button className="retry-button" onClick={fetchCapitulos}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.36 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Grid de capítulos */}
      {!loading && !error && (
        <div className={`capitulos-grid ${editMode ? 'edit-mode' : ''}`}>
          {capitulosFiltrados.map((capitulo) => (
            <div key={capitulo.id} className={`capitulo-container ${editMode ? 'edit-mode' : ''}`}>
              {editMode && canManageCapitulos && (
                <button 
                  className="edit-button"
                  onClick={() => openEditModal(capitulo)}
                  title="Editar capítulo"
                >
                  Editar
                </button>
              )}
              <div className={`capitulo-card ${editMode ? 'edit-mode' : ''}`}>
                {editMode && canManageCapitulos && (
                  <button 
                    className="delete-button"
                    onClick={() => handleDeleteCapitulo(capitulo)}
                    title="Excluir capítulo"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6"></polyline>
                      <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                )}
                <div 
                  className="capitulo-content"
                  onClick={() => navigate(`/livro/${id}/capitulo/${capitulo.id}/secoes`)}
                  style={{ cursor: 'pointer' }}
                >
                  <h3 className="capitulo-title">{capitulo.nome}</h3>
                  <p className="capitulo-info">
                    Por: {capitulo.usuario?.nome || 'Desconhecido'}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {/* Card para adicionar novo capítulo - apenas para admins */}
          {canManageCapitulos && (
            <div className="capitulo-card add-capitulo" onClick={adicionarCapitulo}>
              <div className="add-capitulo-content">
                <div className="add-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mensagem quando não há capítulos */}
      {!loading && !error && capitulos.length === 0 && (
        <div className="no-results">
          <p>
            {canManageCapitulos 
              ? "Nenhum capítulo cadastrado. Clique no botão + para adicionar o primeiro capítulo!"
              : "Nenhum capítulo cadastrado."
            }
          </p>
        </div>
      )}

      {/* Mensagem quando não há resultados na pesquisa */}
      {!loading && !error && capitulos.length > 0 && capitulosFiltrados.length === 0 && searchTerm && (
        <div className="no-results">
          <p>Nenhum capítulo encontrado para "{searchTerm}"</p>
        </div>
      )}

      {/* Modal para adicionar/editar capítulo */}
      {canManageCapitulos && (
        <AddCapituloModal 
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCapitulo(null);
          }}
          onSave={editingCapitulo ? handleEditCapitulo : handleAddCapitulo}
          initialValue={editingCapitulo ? editingCapitulo.nome : ''}
          title={editingCapitulo ? 'Editar Capítulo' : 'Adicionar Novo Capítulo'}
        />
      )}

      {/* Modal para confirmar exclusão */}
      <DeleteCapituloModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        capituloName={deleteModal.capitulo?.nome || ''}
        loading={deleting}
      />
    </div>
  );
};

export default Capitulos;
