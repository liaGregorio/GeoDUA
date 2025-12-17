import React, { useState, useEffect } from 'react';
import '../styles/descricaoPreviewModal.css';
import { AI_PROVIDERS, getAvailableProviders } from '../services/iaService';

const DescricaoPreviewModal = ({ isOpen, onClose, descricaoGerada, provider = 'GROQ', onAccept, onRegenerate, isRegenerating }) => {
  const [editedDescricao, setEditedDescricao] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('GROQ');
  const [availableProviders, setAvailableProviders] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (descricaoGerada) {
        setEditedDescricao(descricaoGerada);
      }
      
      // Carregar providers disponíveis
      const providers = getAvailableProviders();
      setAvailableProviders(providers);
      
      // Usar o provider atual ou o primeiro configurado
      if (provider) {
        setSelectedProvider(provider);
      } else {
        const configured = providers.find(p => p.configured);
        if (configured) {
          setSelectedProvider(configured.id);
        }
      }
    }
  }, [isOpen, descricaoGerada, provider]);

  const handleAccept = () => {
    onAccept(editedDescricao);
  };

  const handleRegenerate = () => {
    onRegenerate(selectedProvider);
  };

  if (!isOpen) return null;

  const selectedProviderInfo = AI_PROVIDERS[selectedProvider];
  const hasConfiguredProvider = availableProviders.some(p => p.configured);

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
            {/* Seletor de Provider */}
            <div className="provider-selector" style={{ marginBottom: '15px' }}>
              <label htmlFor="descricao-provider" style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                </svg>
                Modelo de IA:
              </label>
              <select
                id="descricao-provider"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                disabled={isRegenerating}
                style={{ 
                  width: '100%', 
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  cursor: isRegenerating ? 'not-allowed' : 'pointer',
                  backgroundColor: isRegenerating ? '#f3f4f6' : 'white'
                }}
              >
                {availableProviders.map(prov => (
                  <option 
                    key={prov.id} 
                    value={prov.id}
                    disabled={!prov.configured}
                  >
                    {prov.name} - {prov.description}
                    {!prov.configured && ' (não configurado)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="preview-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Descrição gerada - Você pode editar antes de aplicar
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
              onClick={handleRegenerate}
              disabled={isRegenerating || !hasConfiguredProvider}
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
