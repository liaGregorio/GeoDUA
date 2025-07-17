import React from 'react';

const DeleteSecaoModal = ({ isOpen, onClose, onDelete, secao }) => {
  const handleDelete = async () => {
    try {
      await onDelete(secao.id);
      onClose();
    } catch (error) {
      console.error('Erro ao deletar seção:', error);
      alert('Erro ao deletar seção');
    }
  };

  if (!isOpen || !secao) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Confirmar Exclusão</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <p>Tem certeza que deseja excluir a seção?</p>
          <div className="delete-info">
            <strong>Título:</strong> {secao.titulo || 'Sem título'}
          </div>
          <p className="warning-text">
            ⚠️ Esta ação não pode ser desfeita. Todas as imagens da seção também serão removidas.
          </p>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-danger" onClick={handleDelete}>
            Excluir Seção
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteSecaoModal;
