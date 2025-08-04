import React, { useState } from 'react';
import { useImageUpload } from '../hooks/useImageUpload';

const AddImagemModal = ({ isOpen, onClose, onAdd, idSecao }) => {
  const [formData, setFormData] = useState({
    descricao: '',
    ordem: 1,
    arquivo: null
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const { processImage, uploading, error, clearError } = useImageUpload();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      clearError(); // Limpar erros anteriores
      
      setFormData(prev => ({
        ...prev,
        arquivo: file
      }));
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({
        ...prev,
        arquivo: null
      }));
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.arquivo) {
      alert('Por favor, selecione uma imagem');
      return;
    }

    try {
      // Processar imagem usando o hook
      const processedImage = await processImage(formData.arquivo);
      
      const imagemData = {
        ...processedImage,
        descricao: formData.descricao,
        ordem: parseInt(formData.ordem) || 1,
        id_secao: idSecao
      };

      await onAdd(imagemData);
      
      setFormData({
        descricao: '',
        ordem: 1,
        arquivo: null
      });
      
      setPreviewUrl(null);
      
      // Limpar o input de arquivo
      const fileInput = document.getElementById('arquivo');
      if (fileInput) fileInput.value = '';
      
      onClose();
    } catch (error) {
      console.error('Erro ao adicionar imagem:', error);
      // O erro já está sendo tratado pelo hook
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content image-modal">
        <div className="modal-header">
          <h3>Adicionar imagem</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message" style={{ 
              color: '#e74c3c', 
              background: '#fdf2f2', 
              padding: '10px', 
              border: '1px solid #fecaca',
              borderRadius: '4px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}
          
          <div className="image-upload-section">
            <div className="image-preview-area">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="image-preview" />
              ) : (
                <div className="image-placeholder">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21,15 16,10 5,21"></polyline>
                  </svg>
                  <p>imagem</p>
                </div>
              )}
            </div>
            
            <div className="image-upload-actions">
              <label htmlFor="arquivo" className="upload-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7,10 12,15 17,10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                {formData.arquivo ? 'Alterar imagem' : 'Adicionar imagem'}
              </label>
              <input
                type="file"
                id="arquivo"
                name="arquivo"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              
              {formData.arquivo && (
                <div className="file-info">
                  <p><strong>Arquivo:</strong> {formData.arquivo.name}</p>
                  <p><strong>Tamanho:</strong> {(formData.arquivo.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p><strong>Tipo:</strong> {formData.arquivo.type}</p>
                  <small style={{ color: '#666' }}>
                    * A imagem será comprimida automaticamente para otimizar o upload
                  </small>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <textarea
              id="descricao"
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              placeholder="Digite uma descrição para a imagem"
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={uploading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? 'Processando...' : 'Adicionar Imagem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddImagemModal;
