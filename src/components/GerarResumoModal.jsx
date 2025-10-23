import React, { useState } from 'react';

const GerarResumoModal = ({ isOpen, onClose, onGenerate, textoOriginal }) => {
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const promptPadrao = `Você é um assistente especializado em criar resumos educacionais claros e concisos.
Analise o texto fornecido e crie um resumo objetivo que:
- Capture os pontos principais
- Use linguagem clara e acessível
- Tenha entre 2-4 frases
- Seja direto e informativo
- Mantenha o tom educacional

Retorne apenas o resumo, sem introduções ou explicações adicionais.`;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const prompt = useCustomPrompt ? customPrompt : null;
      await onGenerate(textoOriginal, prompt);
      onClose();
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

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
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
          ) : (
            <>
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
                      Descreva como você quer que o resumo seja gerado
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
                <strong>Dica:</strong> O resumo será gerado baseado no conteúdo da seção usando IA (Groq - Llama 3.3 70B)
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
            disabled={isGenerating || !textoOriginal || textoOriginal.trim().length === 0}
          >
            {isGenerating ? 'Gerando...' : 'Gerar Resumo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GerarResumoModal;
