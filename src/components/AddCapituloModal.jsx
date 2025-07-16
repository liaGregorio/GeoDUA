import { useState, useEffect } from 'react';

const AddCapituloModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialValue = '', 
  title = 'Adicionar Novo Capítulo' 
}) => {
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);

  // Atualizar o valor quando o initialValue muda (para edição)
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    
    setIsLoading(true);
    try {
      await onSave(value.trim());
      setValue('');
    } catch (error) {
      console.error('Erro ao salvar capítulo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setValue('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{title}</h2>
          <button 
            type="button" 
            className="close-button"
            onClick={handleClose}
            disabled={isLoading}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="capitulo-name">Nome do Capítulo</label>
            <input
              id="capitulo-name"
              type="text"
              className="form-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Digite o nome do capítulo"
              disabled={isLoading}
              autoFocus
            />
          </div>
          
          <div className="modal-actions">
            <button 
              type="button" 
              className="cancel-button"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="save-button"
              disabled={!value.trim() || isLoading}
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCapituloModal;
