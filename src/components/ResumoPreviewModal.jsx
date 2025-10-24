import React, { useState } from 'react';
import { AI_PROVIDERS } from '../services/iaService';

const ResumoPreviewModal = ({ 
  isOpen, 
  onClose, 
  resumoGerado, 
  provider,
  onAccept, 
  onRegenerate,
  isRegenerating 
}) => {
  const [userFeedback, setUserFeedback] = useState(null); // true = gostou, false = não gostou

  if (!isOpen) return null;

  const providerInfo = AI_PROVIDERS[provider];

  const handleAccept = () => {
    // Se o usuário não deu feedback, assumir que gostou
    const finalFeedback = userFeedback !== null ? userFeedback : true;
    onAccept(finalFeedback);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h3>Resumo Gerado</h3>
          <button 
            className="close-button" 
            onClick={onClose}
            disabled={isRegenerating}
          >
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          {/* Badge da IA usada */}
          <div style={{ marginBottom: '15px' }}>
            <span className="ai-provider-badge">
              Gerado com {providerInfo?.name}
            </span>
          </div>

          {/* Preview do resumo */}
          <div className="resumo-preview-box">
            <div className="resumo-preview-label">Resumo gerado:</div>
            <div className="resumo-preview-content">
              {resumoGerado.split('\n').map((paragraph, index) => (
                paragraph.trim() !== '' && <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Sistema de Feedback */}
          <div className="resumo-feedback-box">
            <strong>Você gostou deste resumo?</strong>
            <div className="feedback-buttons">
              <button
                className={`feedback-btn ${userFeedback === true ? 'active-positive' : ''}`}
                onClick={() => setUserFeedback(true)}
                disabled={isRegenerating}
              >
                Gostei
              </button>
              <button
                className={`feedback-btn ${userFeedback === false ? 'active-negative' : ''}`}
                onClick={() => setUserFeedback(false)}
                disabled={isRegenerating}
              >
                Não gostei
              </button>
            </div>
            <small className="feedback-hint">
              {userFeedback === null && 'Seu feedback nos ajuda a melhorar!'}
              {userFeedback === true && 'Obrigado pelo feedback positivo!'}
              {userFeedback === false && 'Tente gerar novamente com outro prompt ou IA'}
            </small>
          </div>
        </div>

        <div className="form-actions" style={{ gap: '10px' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onRegenerate}
            disabled={isRegenerating}
            style={{ flex: '1' }}
          >
            {isRegenerating ? 'Gerando...' : 'Gerar Novamente'}
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleAccept}
            disabled={isRegenerating}
            style={{ flex: '1' }}
          >
            Usar Este Resumo
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumoPreviewModal;
