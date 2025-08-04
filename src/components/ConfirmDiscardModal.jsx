import { useState } from 'react';

const ConfirmDiscardModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar" }) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Erro ao confirmar ação:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="confirm-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
          </div>
          <p className="confirm-message">{message}</p>
        </div>

        <div className="form-actions">
          <button 
            className="btn-secondary" 
            onClick={onClose}
            disabled={isConfirming}
          >
            {cancelText}
          </button>
          <button 
            className="btn-danger" 
            onClick={handleConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? 'Confirmando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDiscardModal;
