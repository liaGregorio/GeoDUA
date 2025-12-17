import { useState, useEffect } from 'react';
import { processImageData } from '../utils/imageUtils';
import { AI_PROVIDERS, getAvailableProviders } from '../services/iaService';
import './ImageEditModal.css';

const ImageEditModal = ({ 
  show, 
  onClose, 
  imagem, 
  descricao, 
  onSave,
  onGerarDescricao,
  isGenerating = false
}) => {
  const [editedDescricao, setEditedDescricao] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('GROQ');
  const [availableProviders, setAvailableProviders] = useState([]);

  useEffect(() => {
    if (show) {
      if (descricao !== undefined) {
        setEditedDescricao(descricao || '');
      }
      
      // Carregar providers disponíveis
      const providers = getAvailableProviders();
      setAvailableProviders(providers);
      
      // Selecionar o primeiro provider configurado
      const configured = providers.find(p => p.configured);
      if (configured) {
        setSelectedProvider(configured.id);
      }
    }
  }, [show, descricao]);

  const handleSave = () => {
    onSave(editedDescricao);
  };

  const handleGerarDescricao = () => {
    if (onGerarDescricao) {
      onGerarDescricao(selectedProvider);
    }
  };

  if (!show) return null;

  const processedImage = imagem ? processImageData(imagem) : null;
  const hasConfiguredProvider = availableProviders.some(p => p.configured);

  return (
    <div className="image-edit-modal-overlay" onClick={onClose}>
      <div className="image-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="image-edit-modal-header">
          <h3>Editar Descrição da Imagem</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="image-edit-modal-content">
          <div className="image-preview-container">
            {processedImage ? (
              processedImage.isSTL ? (
                <div className="stl-preview-container">
                  <p className="stl-info">Arquivo 3D (.stl)</p>
                </div>
              ) : (
                <img 
                  src={processedImage.src} 
                  alt={processedImage.descricao || 'Imagem'} 
                  className="image-preview-large"
                  onError={(e) => {
                    console.error('Erro ao carregar imagem:', e);
                    e.target.style.display = 'none';
                  }}
                />
              )
            ) : (
              <div className="stl-preview-container">
                <p className="stl-info">Imagem não disponível</p>
              </div>
            )}
          </div>

          <div className="description-edit-container">
            <label htmlFor="descricao-textarea">Descrição:</label>
            <textarea
              id="descricao-textarea"
              value={editedDescricao}
              onChange={(e) => setEditedDescricao(e.target.value)}
              placeholder="Digite a descrição da imagem..."
              rows={6}
              disabled={isGenerating}
            />
            
            {onGerarDescricao && (
              <div className="ia-generation-controls">
                <div className="provider-select-container">
                  <label htmlFor="provider-select">Modelo de IA:</label>
                  <select
                    id="provider-select"
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    disabled={isGenerating}
                    className="provider-select-small"
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
                <button 
                  className={`generate-ia-btn ${isGenerating ? 'loading' : ''}`}
                  onClick={handleGerarDescricao}
                  disabled={isGenerating || !hasConfiguredProvider}
                >
                  {isGenerating ? (
                    <span className="spinner-small"></span>
                  ) : (
                    <span className="btn-text">Gerar com IA</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="image-edit-modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button 
            className="btn-save" 
            onClick={handleSave}
            disabled={isGenerating}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditModal;
