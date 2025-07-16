const DeleteCapituloModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  capituloName, 
  loading = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="delete-modal-content">
        <div className="delete-modal-header">
          <div className="delete-modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </div>
          <h2>Confirmar Exclusão</h2>
          <button 
            type="button" 
            className="close-button"
            onClick={onClose}
            disabled={loading}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="delete-modal-body">
          <p className="delete-warning">
            Tem certeza que deseja excluir o capítulo <strong>"{capituloName}"</strong>?
          </p>
          <p className="delete-description">
            Esta ação não pode ser desfeita. Todos os dados relacionados a este capítulo serão permanentemente removidos.
          </p>
        </div>
        
        <div className="delete-modal-actions">
          <button 
            type="button" 
            className="cancel-button"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            className="delete-confirm-button"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                </svg>
                Excluindo...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
                Excluir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteCapituloModal;
