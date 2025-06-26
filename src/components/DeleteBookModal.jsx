import { X, Trash2, AlertTriangle } from 'lucide-react';

const DeleteBookModal = ({ isOpen, onClose, onConfirm, bookName, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <div className="delete-modal-icon">
            <AlertTriangle size={24} />
          </div>
          <h2>Excluir Livro</h2>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="delete-modal-body">
          <p className="delete-warning">
            Tem certeza que deseja excluir o livro <strong>"{bookName}"</strong>?
          </p>
          <p className="delete-description">
            Esta ação não pode ser desfeita. Todos os dados relacionados ao livro serão perdidos permanentemente.
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
            <Trash2 size={16} />
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteBookModal;
