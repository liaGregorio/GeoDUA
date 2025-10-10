import './PublishConfirmModal.css';

const PublishConfirmModal = ({ isOpen, onClose, onConfirm, rascunhoNome, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content publish-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Publicar Rascunho</h3>
          <button className="modal-close-button" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="modal-body">
          <p className="confirm-message">
            Tem certeza que deseja publicar o rascunho <strong>"{rascunhoNome}"</strong>?
          </p>
          
          <div className="action-details">
            <p>Esta ação irá:</p>
            <ul>
              <li>Substituir todo o conteúdo atual do capítulo principal</li>
              <li>Mover as seções do rascunho para o capítulo principal</li>
              <li>Excluir o rascunho após a publicação</li>
            </ul>
            <p className="warning-text">⚠️ Esta ação não pode ser desfeita.</p>
          </div>
        </div>
        
        <div className="modal-actions">
          <button 
            className="btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            className="btn-primary btn-danger" 
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Publicando...' : 'Sim, Publicar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishConfirmModal;