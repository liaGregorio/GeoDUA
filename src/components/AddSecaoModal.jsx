import React, { useState, useEffect } from 'react';

const AddSecaoModal = ({ isOpen, onClose, onAdd, idCapitulo, proximaOrdem = 1 }) => {
  const [formData, setFormData] = useState({
    titulo: '',
    resumo: '',
    ordem: proximaOrdem,
    original: '',
    prompt: '',
    texto3d: '',
    feedback: false,
    ordem3d: proximaOrdem
  });

  // Atualizar a ordem quando a próxima ordem mudar
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ordem: proximaOrdem,
      ordem3d: proximaOrdem
    }));
  }, [proximaOrdem]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação básica - só ordem e id_capitulo são obrigatórios
    if (!formData.ordem || !idCapitulo) {
      alert('Ordem e capítulo são obrigatórios');
      return;
    }

    try {
      const secaoData = {
        ...formData,
        id_capitulo: idCapitulo,
        ordem: parseInt(formData.ordem),
        ordem3d: parseInt(formData.ordem3d)
      };
      
      await onAdd(secaoData);
      
      // Reset do formulário
      setFormData({
        titulo: '',
        resumo: '',
        ordem: proximaOrdem,
        original: '',
        prompt: '',
        texto3d: '',
        feedback: false,
        ordem3d: proximaOrdem
      });
      onClose();
    } catch (error) {
      console.error('Erro ao adicionar seção:', error);
      alert('Erro ao adicionar seção: ' + (error.message || 'Erro desconhecido'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Adicionar Nova Seção</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="titulo">Título</label>
            <input
              type="text"
              id="titulo"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              placeholder="Digite o título da seção"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="ordem">Ordem *</label>
            <input
              type="number"
              id="ordem"
              name="ordem"
              value={formData.ordem}
              onChange={handleChange}
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="resumo">Resumo</label>
            <textarea
              id="resumo"
              name="resumo"
              value={formData.resumo}
              onChange={handleChange}
              placeholder="Digite um resumo da seção"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="original">Texto Original</label>
            <textarea
              id="original"
              name="original"
              value={formData.original}
              onChange={handleChange}
              placeholder="Digite o texto original da seção"
              rows="4"
            />
          </div>

          <div className="form-group">
            <label htmlFor="prompt">Prompt</label>
            <textarea
              id="prompt"
              name="prompt"
              value={formData.prompt}
              onChange={handleChange}
              placeholder="Digite o prompt para a seção"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="texto3d">Texto 3D</label>
            <textarea
              id="texto3d"
              name="texto3d"
              value={formData.texto3d}
              onChange={handleChange}
              placeholder="Digite o texto 3D da seção"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ordem3d">Ordem 3D</label>
            <input
              type="number"
              id="ordem3d"
              name="ordem3d"
              value={formData.ordem3d}
              onChange={handleChange}
              min="1"
            />
          </div>

          <div className="form-group checkbox-group">
            <label htmlFor="feedback">
              <input
                type="checkbox"
                id="feedback"
                name="feedback"
                checked={formData.feedback}
                onChange={handleChange}
              />
              Feedback
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Adicionar Seção
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSecaoModal;
