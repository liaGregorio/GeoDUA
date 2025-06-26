import { useState, useEffect } from 'react';

function AddBookModal({ isOpen, onClose, onSave, initialValue = '', title = 'Adicionar Novo Livro' }) {
  const [bookName, setBookName] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);

  // Atualizar o valor quando o modal abrir com initialValue
  useEffect(() => {
    setBookName(initialValue);
  }, [initialValue, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!bookName.trim()) {
      alert('Por favor, digite o nome do livro');
      return;
    }

    setIsLoading(true);
    
    try {
      await onSave(bookName.trim());
      setBookName('');
      onClose();
    } catch (error) {
      console.error('Erro ao criar livro:', error);
      alert('Erro ao criar livro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setBookName('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button 
            className="close-button" 
            onClick={handleClose}
            disabled={isLoading}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="bookName">Nome do Livro</label>
            <input
              type="text"
              id="bookName"
              value={bookName}
              onChange={(e) => setBookName(e.target.value)}
              placeholder="Digite o nome do livro..."
              className="form-input"
              disabled={isLoading}
              autoFocus
            />
          </div>
          
          <div className="modal-actions">
            <button 
              type="button" 
              onClick={handleClose}
              className="cancel-button"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="save-button"
              disabled={isLoading}
            >
              {isLoading 
                ? (initialValue ? 'Salvando...' : 'Criando...') 
                : (initialValue ? 'Salvar' : 'Criar Livro')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddBookModal;
