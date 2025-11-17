import React from 'react';

const DeleteAudioModal = ({ isOpen, onClose, onDelete, loading }) => {
  const handleDelete = async () => {
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Erro ao deletar áudio:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Confirmar Exclusão do Áudio</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="delete-warning-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <p style={{ textAlign: 'center', marginBottom: '10px', fontSize: '16px' }}>
            Tem certeza que deseja excluir o áudio deste capítulo?
          </p>
          <p className="warning-text" style={{ textAlign: 'center' }}>
            ⚠️ Esta ação não pode ser desfeita.
          </p>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            className="btn-danger" 
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
                Excluindo...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6"></polyline>
                  <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                </svg>
                Excluir Áudio
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAudioModal;
