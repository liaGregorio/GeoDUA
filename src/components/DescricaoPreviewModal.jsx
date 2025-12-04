import React, { useState, useEffect } from 'react';
import '../styles/descricaoPreviewModal.css';

const DescricaoPreviewModal = ({ isOpen, onClose, descricaoGerada, onAccept, onRegenerate, isRegenerating }) => {
  const [editedDescricao, setEditedDescricao] = useState('');

  useEffect(() => {
    if (isOpen && descricaoGerada) {
      setEditedDescricao(descricaoGerada);
    }
  }, [isOpen, descricaoGerada]);

  const handleAccept = () => {
    onAccept(editedDescricao);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content descricao-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Descrição Gerada pela IA</h2>
          <button className="modal-close-button" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="descricao-preview-content">
            <div className="preview-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
              </svg>
              Descrição gerada com Google Gemini - Você pode editar antes de aplicar
            </div>
            <textarea
              className="descricao-textarea"
              value={editedDescricao}
              onChange={(e) => setEditedDescricao(e.target.value)}
              disabled={isRegenerating}
              rows={8}
              placeholder="Edite a descrição gerada..."
            />
          </div>

          <div className="preview-actions">
            <button
              className="btn-regenerate"
              onClick={onRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <>
                  <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                  Gerando novamente...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.36 4.36A9 9 0 0 1 3.51 15"></path>
                  </svg>
                  Gerar novamente
                </>
              )}
            </button>
            <button
              className="btn-accept"
              onClick={handleAccept}
              disabled={isRegenerating}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Aceitar e aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DescricaoPreviewModal;
