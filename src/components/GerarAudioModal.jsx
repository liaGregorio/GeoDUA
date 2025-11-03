import { useState, useEffect } from 'react';
import { TTS_PROVIDERS, getAvailableProviders, getSetupInstructions } from '../services/ttsService';
import './GerarAudioModal.css';

const GerarAudioModal = ({ isOpen, onClose, onGenerate, textoOriginal }) => {
  const [selectedProvider, setSelectedProvider] = useState('GOOGLE');
  const [selectedVoice, setSelectedVoice] = useState('pt-BR-Neural2-A');
  const [availableProviders, setAvailableProviders] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const providers = getAvailableProviders();
    setAvailableProviders(providers);

    // Selecionar primeiro provider configurado
    const configured = providers.find(p => p.configured);
    if (configured) {
      setSelectedProvider(configured.id);
      setSelectedVoice(configured.voices[0].id);
    }
  }, [isOpen]);

  useEffect(() => {
    // Atualizar voz padrão quando provider mudar
    if (selectedProvider && TTS_PROVIDERS[selectedProvider]) {
      setSelectedVoice(TTS_PROVIDERS[selectedProvider].voices[0].id);
    }
  }, [selectedProvider]);

  const handleGenerate = async () => {
    if (!textoOriginal || textoOriginal.trim().length === 0) {
      setErrorMessage('Não há texto disponível para gerar áudio');
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');
    try {
      await onGenerate(textoOriginal, selectedProvider, selectedVoice);
      onClose();
    } catch (error) {
      console.error('Erro ao gerar áudio:', error);
      
      // Mensagens de erro mais amigáveis
      let friendlyMessage = error.message;
      
      if (error.message.includes('401') && error.message.includes('ElevenLabs')) {
        friendlyMessage = 'ElevenLabs: Acesso bloqueado. O plano gratuito pode estar temporariamente indisponível ou você pode estar usando VPN/proxy. Tente usar o Google Cloud TTS ou aguarde algumas horas.';
      } else if (error.message.includes('403') && error.message.includes('ElevenLabs')) {
        friendlyMessage = 'ElevenLabs: Limite de uso gratuito atingido. Use o Google Cloud TTS ou aguarde o próximo ciclo.';
      } else if (error.message.includes('429')) {
        friendlyMessage = 'Muitas requisições. Aguarde alguns segundos e tente novamente.';
      } else if (error.message.includes('não configurada')) {
        friendlyMessage = error.message;
      }
      
      setErrorMessage(friendlyMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const getInstructions = () => {
    return getSetupInstructions(selectedProvider);
  };

  if (!isOpen) return null;

  const currentProvider = TTS_PROVIDERS[selectedProvider];
  const isConfigured = availableProviders.find(p => p.id === selectedProvider)?.configured;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content gerar-audio-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Gerar Áudio com IA</h2>
          <button className="modal-close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {errorMessage && (
            <div className="error-message-modal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{errorMessage}</span>
              <button 
                className="error-close"
                onClick={() => setErrorMessage('')}
              >
                ×
              </button>
            </div>
          )}

          {!isConfigured && (
            <div className="warning-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Este serviço não está configurado. Configure a chave de API primeiro.</span>
              <button 
                className="btn-show-instructions"
                onClick={() => setShowInstructions(!showInstructions)}
              >
                {showInstructions ? 'Ocultar' : 'Ver'} instruções
              </button>
            </div>
          )}

          {showInstructions && !isConfigured && (
            <div className="instructions-panel">
              <h3>Como configurar {currentProvider.name}</h3>
              <div className="steps-section">
                <ol>
                  {getInstructions().instructions.slice(0, 5).map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          <div className="form-section">
            <label>Serviço de TTS:</label>
            <div className="provider-options">
              {availableProviders.map((provider) => (
                <button
                  key={provider.id}
                  className={`provider-option ${selectedProvider === provider.id ? 'selected' : ''} ${!provider.configured ? 'unconfigured' : ''}`}
                  onClick={() => setSelectedProvider(provider.id)}
                  disabled={!provider.configured}
                >
                  <div className="provider-info">
                    <div className="provider-name">
                      {provider.name}
                      {provider.configured && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22,4 12,14.01 9,11.01"></polyline>
                        </svg>
                      )}
                    </div>
                    <div className="provider-description">{provider.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {currentProvider && isConfigured && (
            <div className="form-section">
              <label>Voz:</label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="voice-select"
              >
                {currentProvider.voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} ({voice.gender === 'female' ? 'Feminina' : 'Masculina'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="preview-section">
            <label>Texto a ser convertido:</label>
            <div className="text-preview">
              {textoOriginal ? (
                <p>{textoOriginal.substring(0, 300)}{textoOriginal.length > 300 ? '...' : ''}</p>
              ) : (
                <p className="no-text">Nenhum texto disponível</p>
              )}
            </div>
            {textoOriginal && (
              <div className="text-stats">
                <span>{textoOriginal.length} caracteres</span>
                <span>≈ {Math.ceil(textoOriginal.length / 150)}s de áudio</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn-secondary"
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancelar
          </button>
          <button 
            className="btn-primary"
            onClick={handleGenerate}
            disabled={!isConfigured || isGenerating || !textoOriginal || textoOriginal.trim().length === 0}
          >
            {isGenerating ? (
              <>
                <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
                Gerando...
              </>
            ) : (
              'Gerar Áudio'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GerarAudioModal;
