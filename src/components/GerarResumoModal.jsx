import React, { useState, useEffect } from 'react';
import { AI_PROVIDERS, getAvailableProviders, getDefaultPrompt } from '../services/iaService';

const GerarResumoModal = ({ isOpen, onClose, onGenerate, textoOriginal }) => {
  const [selectedProvider, setSelectedProvider] = useState('GROQ');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableProviders, setAvailableProviders] = useState([]);

  const promptPadrao = getDefaultPrompt();

  useEffect(() => {
    // Carregar providers disponíveis ao abrir o modal
    if (isOpen) {
      const providers = getAvailableProviders();
      setAvailableProviders(providers);
      
      // Selecionar o primeiro provider configurado
      const configured = providers.find(p => p.configured);
      if (configured) {
        setSelectedProvider(configured.id);
      }
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const prompt = useCustomPrompt ? customPrompt : null;
      await onGenerate(textoOriginal, selectedProvider, prompt);
      // Não fechar mais aqui - o preview que vai decidir
    } catch (error) {
      console.error('Erro ao gerar resumo:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setUseCustomPrompt(false);
      setCustomPrompt('');
      onClose();
    }
  };

  if (!isOpen) return null;

  const selectedProviderInfo = AI_PROVIDERS[selectedProvider];
  const hasConfiguredProvider = availableProviders.some(p => p.configured);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h3>Gerar Resumo com IA</h3>
          <button 
            className="close-button" 
            onClick={handleClose}
            disabled={isGenerating}
          >
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          {!textoOriginal || textoOriginal.trim().length === 0 ? (
            <div className="alert-warning-resumo">
              <strong>Atenção:</strong> É necessário adicionar um conteúdo na seção antes de gerar o resumo.
            </div>
          ) : !hasConfiguredProvider ? (
            <div className="alert-warning-resumo">
              <strong>Nenhuma IA configurada!</strong>
              <p style={{ marginTop: '10px', marginBottom: '0' }}>
                Configure pelo menos uma chave de API (Groq ou Gemini) no arquivo .env para usar esta funcionalidade.
              </p>
            </div>
          ) : (
            <>
              {/* Seletor de Provider */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label htmlFor="ai-provider">
                  <strong>Escolha a IA:</strong>
                </label>
                <select
                  id="ai-provider"
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  disabled={isGenerating}
                  className="provider-select"
                  style={{ 
                    width: '100%', 
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {availableProviders.map(provider => (
                    <option 
                      key={provider.id} 
                      value={provider.id}
                      disabled={!provider.configured}
                    >
                      {provider.name} - {provider.description}
                      {!provider.configured && ' (não configurado)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="checkbox-container-resumo">
                <label className="checkbox-label-resumo">
                  <input
                    type="checkbox"
                    checked={useCustomPrompt}
                    onChange={(e) => setUseCustomPrompt(e.target.checked)}
                    disabled={isGenerating}
                    className="checkbox-input-resumo"
                  />
                  <span>Usar prompt personalizado</span>
                </label>
              </div>

              {!useCustomPrompt && (
                <div className="info-box-resumo info-box-default">
                  <h4>Prompt Padrão:</h4>
                  <p>{promptPadrao}</p>
                </div>
              )}

              {useCustomPrompt && (
                <div className="form-group">
                  <label htmlFor="customPrompt">
                    Prompt Personalizado:
                    <small style={{ display: 'block', marginTop: '5px', opacity: 0.8 }}>
                      Descreva como você quer que o resumo seja gerado. 
                      O sistema sempre adiciona: "Retorne apenas o resumo, sem introduções ou explicações adicionais."
                    </small>
                  </label>
                  <textarea
                    id="customPrompt"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Ex: Crie um resumo técnico de 3 linhas focado em conceitos científicos..."
                    rows="6"
                    disabled={isGenerating}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              )}

              <div className="info-box-resumo info-box-tip">
                <strong>Dica:</strong> O resumo será gerado e você poderá revisar antes de aceitar.
              </div>
            </>
          )}
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={handleClose}
            disabled={isGenerating}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleGenerate}
            disabled={isGenerating || !textoOriginal || textoOriginal.trim().length === 0 || !hasConfiguredProvider}
          >
            {isGenerating ? 'Gerando...' : 'Gerar Resumo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GerarResumoModal;
