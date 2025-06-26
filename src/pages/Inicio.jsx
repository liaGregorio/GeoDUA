import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import AddBookModal from '../components/AddBookModal';
import DeleteBookModal from '../components/DeleteBookModal';
import { createBook, getBooks, updateBook, deleteBook } from '../services/bookService';

const Inicio = () => {
  const { searchTerm, editMode } = useOutletContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [livros, setLivros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, book: null });
  const [deleting, setDeleting] = useState(false);

  // Carregar livros da API
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);
        const books = await getBooks();
        setLivros(books);
      } catch (err) {
        setError('Erro ao carregar livros');
        console.error('Erro ao buscar livros:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  // Filtrar livros baseado na pesquisa
  const livrosFiltrados = (livros || []).filter(livro =>
    livro.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddBook = async (bookName) => {
    try {
      await createBook(bookName);
      // Recarregar a lista de livros após adicionar
      const books = await getBooks();
      setLivros(books);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao adicionar livro:', error);
      alert('Erro ao adicionar livro. Tente novamente.');
    }
  };

  const handleEditBook = async (bookName) => {
    try {
      await updateBook(editingBook.id, bookName);
      // Recarregar a lista de livros após editar
      const books = await getBooks();
      setLivros(books);
      setIsModalOpen(false);
      setEditingBook(null);
    } catch (error) {
      console.error('Erro ao editar livro:', error);
      alert('Erro ao editar livro. Tente novamente.');
    }
  };

  const handleDeleteBook = (book) => {
    setDeleteModal({ isOpen: true, book });
  };

  const confirmDelete = async () => {
    if (!deleteModal.book) return;
    
    try {
      setDeleting(true);
      await deleteBook(deleteModal.book.id);
      // Recarregar a lista de livros após deletar
      const books = await getBooks();
      setLivros(books);
      setDeleteModal({ isOpen: false, book: null });
    } catch (error) {
      console.error('Erro ao deletar livro:', error);
      alert('Erro ao deletar livro. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    if (!deleting) {
      setDeleteModal({ isOpen: false, book: null });
    }
  };

  const adicionarLivro = () => {
    setIsModalOpen(true);
  };

  const openEditModal = (livro) => {
    setEditingBook(livro);
    setIsModalOpen(true);
  };

  return (
    <div className="inicio-container">
      {/* Loading state */}
      {loading && (
        <div className="loading-message">
          <p>Carregando livros...</p>
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
          <button className="retry-button" onClick={() => window.location.reload()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.36 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Grid de livros */}
      {!loading && !error && (
        <div className="books-grid">
          {livrosFiltrados.map((livro) => (
            <div key={livro.id} className={`book-container ${editMode ? 'edit-mode' : ''}`}>
              {editMode && (
                <button 
                  className="edit-button"
                  onClick={() => openEditModal(livro)}
                  title="Editar livro"
                >
                  Editar
                </button>
              )}
              <div className={`book-card ${editMode ? 'edit-mode' : ''}`}>
                {editMode && (
                  <button 
                    className="delete-button"
                    onClick={() => handleDeleteBook(livro)}
                    title="Excluir livro"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6"></polyline>
                      <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                )}
                <div className="book-content">
                  <h3 className="book-title">{livro.nome}</h3>
                </div>
              </div>
            </div>
          ))}
          
          {/* Card para adicionar novo livro */}
          <div className="book-card add-book" onClick={adicionarLivro}>
            <div className="add-book-content">
              <div className="add-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem quando não há livros */}
      {!loading && !error && livros.length === 0 && (
        <div className="no-results">
          <p>Nenhum livro cadastrado. Clique no botão + para adicionar o primeiro livro!</p>
        </div>
      )}

      {/* Mensagem quando não há resultados na pesquisa */}
      {!loading && !error && livros.length > 0 && livrosFiltrados.length === 0 && searchTerm && (
        <div className="no-results">
          <p>Nenhum livro encontrado para "{searchTerm}"</p>
        </div>
      )}

      {/* Modal para adicionar/editar livro */}
      <AddBookModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBook(null);
        }}
        onSave={editingBook ? handleEditBook : handleAddBook}
        initialValue={editingBook ? editingBook.nome : ''}
        title={editingBook ? 'Editar Livro' : 'Adicionar Novo Livro'}
      />

      {/* Modal para confirmar exclusão */}
      <DeleteBookModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        bookName={deleteModal.book?.nome || ''}
        loading={deleting}
      />
    </div>
  );
};

export default Inicio;
