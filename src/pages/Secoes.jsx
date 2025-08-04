import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSecoes, createSecao, updateSecao, deleteSecao } from '../services/secaoService';
import { getImagens, createImagem, deleteImagem, fileToBytea } from '../services/imagemService';
import { getCapitulos } from '../services/capituloService';
import { processImageData } from '../utils/imageUtils';
import DeleteSecaoModal from '../components/DeleteSecaoModal';
import AddImagemModal from '../components/AddImagemModal';
import ConfirmDiscardModal from '../components/ConfirmDiscardModal';

const Secoes = () => {
  const { livroId, capituloId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { editMode, searchTerm } = useOutletContext();
  
  const [secoes, setSecoes] = useState([]);
  const [capitulo, setCapitulo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSecao, setExpandedSecao] = useState(null);
  const [secaoImages, setSecaoImages] = useState({});
  const [loadingImages, setLoadingImages] = useState({});
  
  // Estados para edição inline (sempre ativo para admins)
  const [secoesEditadas, setSecoesEditadas] = useState([]);
  const [novasSecoes, setNovasSecoes] = useState([]);
  const [saving, setSaving] = useState(false);
  
  // Estados dos modais (manter apenas para imagens)
  const [showDeleteSecaoModal, setShowDeleteSecaoModal] = useState(false);
  const [showAddImagemModal, setShowAddImagemModal] = useState(false);
  const [showConfirmDiscardModal, setShowConfirmDiscardModal] = useState(false);
  const [selectedSecao, setSelectedSecao] = useState(null);
  const [selectedSecaoForImage, setSelectedSecaoForImage] = useState(null);

  // Verificar se o usuário pode gerenciar seções
  const canManageSecoes = user && user.tipoUsuario && user.tipoUsuario.id === 1;

  // Buscar informações do capítulo
  const fetchCapitulo = async () => {
    try {
      const capitulos = await getCapitulos(livroId);
      const capituloEncontrado = capitulos.find(cap => cap.id === parseInt(capituloId));
      setCapitulo(capituloEncontrado);
    } catch (err) {
      console.error('Erro ao buscar capítulo:', err);
    }
  };

  // Buscar seções do capítulo
  const fetchSecoes = async () => {
    try {
      setLoading(true);
      setError(null);
      const secoesData = await getSecoes(capituloId);
      
      // Garantir que secoesData seja um array antes de ordenar
      const secoesArray = Array.isArray(secoesData) ? secoesData : [];
      const secoesOrdenadas = secoesArray.sort((a, b) => a.ordem - b.ordem);
      setSecoes(secoesOrdenadas);
      
      // Carregar imagens automaticamente para todas as seções
      if (secoesOrdenadas.length > 0) {
        secoesOrdenadas.forEach(secao => {
          fetchImagensSecao(secao.id);
        });
      }
    } catch (err) {
      console.error('Erro ao buscar seções:', err);
      setError(err.message || 'Erro ao carregar seções');
      setSecoes([]);
    } finally {
      setLoading(false);
    }
  };

  // Buscar imagens de uma seção
  const fetchImagensSecao = async (secaoId, forceReload = false) => {
    if (!forceReload && (loadingImages[secaoId] || secaoImages[secaoId])) {
      return;
    }
    
    try {
      setLoadingImages(prev => ({ ...prev, [secaoId]: true }));
      
      const imagens = await getImagens(secaoId);
      
      // Garantir que imagens seja um array antes de ordenar
      const imagensArray = Array.isArray(imagens) ? imagens : [];
      const imagensOrdenadas = imagensArray.sort((a, b) => a.ordem - b.ordem);
      
      setSecaoImages(prev => ({ ...prev, [secaoId]: imagensOrdenadas }));
    } catch (err) {
      console.error('Erro ao buscar imagens da seção:', secaoId, err);
      setSecaoImages(prev => ({ ...prev, [secaoId]: [] }));
    } finally {
      setLoadingImages(prev => ({ ...prev, [secaoId]: false }));
    }
  };

  useEffect(() => {
    fetchCapitulo();
    fetchSecoes();
  }, [livroId, capituloId]);

  // Filtrar seções baseado na pesquisa
  const secoesFiltradas = (secoes || []).filter(secao => {
    // Se não há termo de pesquisa, mostrar todas
    if (!searchTerm || searchTerm.trim() === '') return true;
    
    return secao.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           secao.resumo?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleExpandSecao = (secaoId) => {
    if (expandedSecao === secaoId) {
      setExpandedSecao(null);
    } else {
      setExpandedSecao(secaoId);
      fetchImagensSecao(secaoId);
    }
  };

  const handleVoltar = () => {
    navigate(`/livro/${livroId}/capitulos`);
  };

  const handleUpdateSecao = (secaoId, field, value) => {
    // Encontrar a seção existente
    const secaoExistenteIndex = secoesEditadas.findIndex(s => s.id === secaoId);
    
    if (secaoExistenteIndex >= 0) {
      // Atualizar seção já em edição
      setSecoesEditadas(prev => prev.map(secao => 
        secao.id === secaoId ? { ...secao, [field]: value } : secao
      ));
    } else {
      // Adicionar nova seção à lista de editadas
      const secaoOriginal = secoes.find(s => s.id === secaoId);
      if (secaoOriginal) {
        const secaoEditada = { ...secaoOriginal, [field]: value };
        setSecoesEditadas(prev => [...prev, secaoEditada]);
      }
    }
  };

  // Função helper para obter o valor atual de uma seção (editada ou original)
  const getSecaoValue = (secaoId, field) => {
    const secaoEditada = secoesEditadas.find(s => s.id === secaoId);
    if (secaoEditada) {
      return secaoEditada[field];
    }
    const secaoOriginal = secoes.find(s => s.id === secaoId);
    return secaoOriginal ? secaoOriginal[field] : '';
  };

  const handleAddImagem = async (secaoId, file) => {
    try {
      const byteaContent = await fileToBytea(file);
      const imagens = secaoImages[secaoId] || [];
      const novaOrdem = imagens.length > 0 ? Math.max(...imagens.map(img => img.ordem)) + 1 : 1;
      
      const imagemData = {
        conteudo: Array.from(byteaContent),
        content_type: file.type,
        descricao: file.name,
        ordem: novaOrdem,
        id_secao: parseInt(secaoId)
      };
      
      await createImagem(imagemData);
      // Forçar recarregamento das imagens
      setSecaoImages(prev => {
        const newImages = { ...prev };
        delete newImages[secaoId];
        return newImages;
      });
      await fetchImagensSecao(secaoId);
    } catch (error) {
      console.error('Erro ao adicionar imagem:', error);
      alert('Erro ao adicionar imagem. Tente novamente.');
    }
  };

  const handleAddImagemFromModal = async (imagemData) => {
    try {
      const result = await createImagem(imagemData);
      
      // Forçar limpeza completa do cache de imagens da seção
      const secaoId = imagemData.id_secao;
      
      setSecaoImages(prev => {
        const newImages = { ...prev };
        delete newImages[secaoId];
        return newImages;
      });
      
      setLoadingImages(prev => {
        const newLoading = { ...prev };
        delete newLoading[secaoId];
        return newLoading;
      });
      
      // Aguardar um pouco antes de recarregar
      setTimeout(async () => {
        await fetchImagensSecao(secaoId, true);
      }, 500);
      
    } catch (error) {
      console.error('Erro ao adicionar imagem:', error);
      throw error;
    }
  };

  // Função para renderizar conteúdo da seção para usuários não logados
  const renderSecaoContentUser = (secao) => {
    // Organizar todos os elementos da seção por ordem
    const items = [];

    // Adicionar conteúdo original se existir
    if (secao.original && secao.original.trim() !== '') {
      items.push({
        type: 'original',
        content: secao.original,
        ordem: secao.ordem || 1
      });
    }

    // Adicionar link 3D se existir
    if (secao.link3d && secao.link3d.trim() !== '') {
      items.push({
        type: 'link3d',
        content: secao.link3d,
        ordem: secao.ordem3d || 2
      });
    }

    // Adicionar imagens se existirem
    const imagens = secaoImages[secao.id] || [];
    if (imagens.length > 0) {
      imagens.forEach(imagem => {
        items.push({
          type: 'imagem',
          content: imagem,
          ordem: imagem.ordem || 3
        });
      });
    }

    // Ordenar items por ordem
    items.sort((a, b) => a.ordem - b.ordem);

    return (
      <div className="secao-content-user">
        {items.map((item, index) => (
          <div key={`${item.type}-${index}`} className="secao-content-element">
            {item.type === 'original' && (
              <div className="secao-texto">
                {item.content.split('\n').map((paragraph, pIndex) => (
                  paragraph.trim() !== '' && <p key={pIndex}>{paragraph}</p>
                ))}
              </div>
            )}
            {item.type === 'link3d' && (
              <div className="secao-link3d-user">
                <a 
                  href={item.content} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="link-3d-button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15,3 21,3 21,9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  Ver modelo 3D
                </a>
              </div>
            )}
            {item.type === 'imagem' && (
              <div className="secao-imagem-user">
                {(() => {
                  const processedImage = processImageData(item.content);
                  return processedImage ? (
                    <div className="image-container">
                      <img 
                        src={processedImage.src} 
                        alt={processedImage.descricao || 'Imagem'} 
                        onError={(e) => {
                          console.error('Erro ao carregar imagem:', e);
                          e.target.style.display = 'none';
                        }}
                      />
                      {processedImage.descricao && processedImage.descricao !== item.content.id.toString() && (
                        <p className="image-caption">{processedImage.descricao}</p>
                      )}
                    </div>
                  ) : (
                    <div className="image-error">
                      <p>Erro ao carregar imagem</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Função para renderizar conteúdo da seção para usuários não logados (função antiga - mantida para compatibilidade)
  const renderSecaoContent = (secao) => {
    if (canManageSecoes) {
      return renderSecaoContentAdmin(secao);
    }

    // Para usuários não logados, renderizar baseado na ordem (sem título pois já está na preview)
    const items = [];

    // Adicionar conteúdo original se existir
    if (secao.original) {
      items.push({
        type: 'original',
        content: secao.original,
        ordem: secao.ordem || 1
      });
    }

    // Adicionar link 3D se existir
    if (secao.link3d) {
      items.push({
        type: 'link3d',
        content: secao.link3d,
        ordem: secao.ordem3d || 2
      });
    }

    // Adicionar imagens se existirem
    const imagens = secaoImages[secao.id] || [];
    if (imagens.length > 0) {
      imagens.forEach(imagem => {
        items.push({
          type: 'imagem',
          content: imagem,
          ordem: imagem.ordem || 3
        });
      });
    }

    // Ordenar items por ordem
    items.sort((a, b) => a.ordem - b.ordem);

    return (
      <div className="secao-content">
        {items.map((item, index) => (
          <div key={`${item.type}-${index}`} className="secao-content-item">
            {item.type === 'original' && (
              <div className="secao-original">{item.content}</div>
            )}
            {item.type === 'link3d' && (
              <div className="secao-link3d">
                <a href={item.content} target="_blank" rel="noopener noreferrer">
                  {item.content}
                </a>
              </div>
            )}
            {item.type === 'imagem' && (
              <div className="secao-imagem">
                {(() => {
                  const processedImage = processImageData(item.content);
                  return processedImage ? (
                    <img 
                      src={processedImage.src} 
                      alt={processedImage.descricao} 
                      onError={(e) => {
                        console.error('Erro ao carregar imagem:', e);
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="image-error">
                      <p>Erro ao carregar imagem</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Função para renderizar conteúdo da seção para admins
  const renderSecaoContentAdmin = (secao) => {
    return (
      <div className="secao-content">
        <div className="secao-text">
          <h4>Conteúdo:</h4>
          <textarea
            value={getSecaoValue(secao.id, 'original') || ''}
            onChange={(e) => handleUpdateSecao(secao.id, 'original', e.target.value)}
            className="secao-content-input"
            rows="6"
            placeholder="Digite o conteúdo da seção"
          />
        </div>

        {/* Campo Link 3D */}
        <div className="secao-link3d">
          <h4>Link 3D:</h4>
          <input
            type="url"
            value={getSecaoValue(secao.id, 'link3d') || ''}
            onChange={(e) => handleUpdateSecao(secao.id, 'link3d', e.target.value)}
            className="secao-link3d-input"
            placeholder="https://..."
          />
        </div>

        <div className="secao-imagens">
          <div className="imagens-header">
            <h4>Imagens:</h4>
            <button 
              className="add-image-button"
              onClick={() => handleAddImagemModal(secao)}
              title="Adicionar imagem"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Adicionar Imagem
            </button>
          </div>
          
          {loadingImages[secao.id] ? (
            <p>Carregando imagens...</p>
          ) : (
            <div className="imagens-grid">
              {secaoImages[secao.id]?.map(renderImage)}
              {(!secaoImages[secao.id] || secaoImages[secao.id].length === 0) && (
                <p className="no-images">Nenhuma imagem cadastrada</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderImage = (imagem) => {
    const processedImage = processImageData(imagem);
    
    if (!processedImage) {
      return (
        <div key={imagem.id} className="secao-imagem error">
          <div className="image-error">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <p>Erro ao carregar imagem</p>
          </div>
        </div>
      );
    }
    
    return (
      <div key={imagem.id} className="secao-imagem">
        <img 
          src={processedImage.src} 
          alt={processedImage.descricao} 
          onError={(e) => {
            console.error('Erro ao carregar imagem:', e);
            e.target.style.display = 'none';
          }}
        />
        {canManageSecoes && (
          <button 
            className="delete-image-button"
            onClick={() => handleDeleteImagem(imagem.id)}
            title="Remover imagem"
          >
            ×
          </button>
        )}
      </div>
    );
  };

  const handleDeleteImagem = async (imagemId) => {
    try {
      await deleteImagem(imagemId);
      // Atualizar as imagens da seção
      const secaoId = Object.keys(secaoImages).find(id => 
        secaoImages[id].some(img => img.id === imagemId)
      );
      if (secaoId) {
        // Forçar recarregamento das imagens
        setSecaoImages(prev => {
          const newImages = { ...prev };
          delete newImages[secaoId];
          return newImages;
        });
        await fetchImagensSecao(secaoId);
      }
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      alert('Erro ao deletar imagem. Tente novamente.');
    }
  };

  // Funções dos modais
  const handleAddSecao = async (secaoData) => {
    try {
      await createSecao(secaoData);
      await fetchSecoes();
    } catch (error) {
      console.error('Erro ao adicionar seção:', error);
      throw error;
    }
  };

  // Funções para edição inline (simplificado para admins)
  const adicionarNovaSecao = () => {
    // Calcular a próxima ordem baseada em todas as seções existentes
    const proximaOrdem = Math.max(
      ...secoes.map(s => s.ordem),
      ...novasSecoes.map(s => s.ordem),
      0
    ) + 1;
    
    const novaSecao = {
      id: `nova-${Date.now()}`, // ID temporário
      titulo: '',
      resumo: '',
      original: '',
      link3d: '',
      ordem: proximaOrdem,
      id_capitulo: parseInt(capituloId),
      isNew: true
    };
    
    setNovasSecoes(prev => [...prev, novaSecao]);
  };

  const atualizarSecaoEditada = (secaoId, campo, valor) => {
    if (secaoId.toString().startsWith('nova-')) {
      // Atualizar nova seção
      setNovasSecoes(prev => prev.map(secao => 
        secao.id === secaoId ? { ...secao, [campo]: valor } : secao
      ));
    } else {
      // Atualizar seção existente
      setSecoesEditadas(prev => prev.map(secao => 
        secao.id === secaoId ? { ...secao, [campo]: valor } : secao
      ));
    }
  };

  // Função específica para atualizar novas seções
  const atualizarNovaSecao = (secaoId, campo, valor) => {
    setNovasSecoes(prev => prev.map(secao => 
      secao.id === secaoId ? { ...secao, [campo]: valor } : secao
    ));
  };

  // Função específica para remover novas seções
  const removerNovaSecao = (secaoId) => {
    setNovasSecoes(prev => prev.filter(secao => secao.id !== secaoId));
  };

  const removerSecao = (secaoId) => {
    if (secaoId.toString().startsWith('nova-')) {
      setNovasSecoes(prev => prev.filter(secao => secao.id !== secaoId));
    } else {
      setSecoesEditadas(prev => prev.filter(secao => secao.id !== secaoId));
    }
  };

  const salvarSecoes = async () => {
    try {
      setSaving(true);
      
      // Salvar alterações nas seções existentes
      for (const secaoEditada of secoesEditadas) {
        const secaoOriginal = secoes.find(s => s.id === secaoEditada.id);
        if (secaoOriginal && JSON.stringify(secaoOriginal) !== JSON.stringify(secaoEditada)) {
          await updateSecao(secaoEditada.id, secaoEditada);
        }
      }
      
      // Criar novas seções
      for (const novaSecao of novasSecoes) {
        const { id, isNew, ...secaoData } = novaSecao;
        await createSecao(secaoData);
      }
      
      // Recarregar seções
      await fetchSecoes();
      setSecoesEditadas([]);
      setNovasSecoes([]);
      
      alert('Seções salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar seções:', error);
      alert('Erro ao salvar seções: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const descartarAlteracoes = () => {
    setShowConfirmDiscardModal(true);
  };

  const confirmarDescarte = () => {
    setSecoesEditadas([]);
    setNovasSecoes([]);
  };

  const salvarComoRascunho = async () => {
    // TODO: Implementar lógica para criar capítulo de rascunho
    alert('Funcionalidade de rascunho será implementada em breve');
  };

  const handleDeleteSecaoModal = (secao) => {
    setSelectedSecao(secao);
    setShowDeleteSecaoModal(true);
  };

  const handleConfirmDeleteSecao = async (secaoId) => {
    try {
      await deleteSecao(secaoId);
      await fetchSecoes();
      // Limpar imagens da seção deletada
      setSecaoImages(prev => {
        const newImages = { ...prev };
        delete newImages[secaoId];
        return newImages;
      });
    } catch (error) {
      console.error('Erro ao deletar seção:', error);
      throw error;
    }
  };

  const handleAddImagemModal = (secao) => {
    setSelectedSecaoForImage(secao);
    setShowAddImagemModal(true);
  };

  return (
    <div className="secoes-container">
      {/* Header com botão voltar */}
      <div className="secoes-header">
        <button className="voltar-button" onClick={handleVoltar}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5"></path>
            <path d="M12 19l-7-7 7-7"></path>
          </svg>
          Voltar
        </button>
        
        <div className="secoes-title">
          {capitulo && <h1>{capitulo.nome}</h1>}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="loading-message">
          <p>Carregando seções...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="error-message">
          <div className="error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <h3>Oops! Algo deu errado</h3>
          <p>{error}</p>
          <p className="error-details">Verifique sua conexão com a internet ou tente novamente em alguns instantes.</p>
          <button className="retry-button" onClick={fetchSecoes}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.36 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Lista de seções */}
      {!loading && !error && (
        <div className="secoes-list">
          {canManageSecoes ? (
            <>
              {/* Seções existentes para admin */}
              {secoesFiltradas.map((secao) => (
                <div 
                  key={secao.id} 
                  className={`secao-card ${expandedSecao === secao.id ? 'expanded' : ''} ${secoesEditadas.find(s => s.id === secao.id) ? 'secao-editada' : ''}`}
                >
                  <div className="secao-header">
                    <div className="secao-info">
                      <div className="form-group">
                        <label>Título</label>
                        <input
                          type="text"
                          value={getSecaoValue(secao.id, 'titulo') || ''}
                          onChange={(e) => handleUpdateSecao(secao.id, 'titulo', e.target.value)}
                          className="secao-titulo-input"
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Título da seção"
                        />
                        {secoesEditadas.find(s => s.id === secao.id) && (
                          <span className="edit-indicator" title="Alterações não salvas">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"></circle>
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Resumo</label>
                        <textarea
                          value={getSecaoValue(secao.id, 'resumo') || ''}
                          onChange={(e) => handleUpdateSecao(secao.id, 'resumo', e.target.value)}
                          className="secao-resumo-input"
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Digite um resumo da seção"
                          rows="3"
                        />
                      </div>
                    </div>
                    
                    <div className="secao-actions">
                      <button 
                        className="delete-secao-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSecaoModal(secao);
                        }}
                        title="Excluir seção"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6"></polyline>
                          <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                  {renderSecaoContentAdmin(secao)}
                </div>
              ))}

              {/* Novas seções (edição inline para admins) */}
              {novasSecoes.map((secao) => (
                <div key={secao.id} className="secao-card secao-card-nova">
                  <div className="secao-header">
                    <div className="secao-info">
                      <div className="form-group">
                        <label>Título</label>
                        <input
                          type="text"
                          value={secao.titulo || ''}
                          onChange={(e) => atualizarNovaSecao(secao.id, 'titulo', e.target.value)}
                          className="secao-titulo-input"
                          placeholder="Título da nova seção (opcional)"
                        />
                      </div>
                      <div className="form-group">
                        <label>Resumo</label>
                        <textarea
                          value={secao.resumo || ''}
                          onChange={(e) => atualizarNovaSecao(secao.id, 'resumo', e.target.value)}
                          placeholder="Digite um resumo da seção"
                          rows="3"
                        />
                      </div>
                      <div className="form-group">
                        <label>Conteúdo</label>
                        <textarea
                          value={secao.original || ''}
                          onChange={(e) => atualizarNovaSecao(secao.id, 'original', e.target.value)}
                          placeholder="Digite o conteúdo da seção"
                          rows="5"
                        />
                      </div>
                      <div className="form-group">
                        <label>Link 3D</label>
                        <input
                          type="url"
                          value={secao.link3d || ''}
                          onChange={(e) => atualizarNovaSecao(secao.id, 'link3d', e.target.value)}
                          placeholder="https://..."
                          className="secao-link3d-input"
                        />
                      </div>
                      <div className="secao-actions-editing">
                        <button 
                          className="btn-danger"
                          onClick={() => removerNovaSecao(secao.id)}
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Botão para adicionar nova seção */}
              <div className="add-secao-container">
                <button 
                  className="add-secao-button-styled"
                  onClick={adicionarNovaSecao}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  adicionar conteúdo
                </button>
              </div>

              {/* Botões de ação - apenas descartar quando há alterações */}
              {(secoesEditadas.length > 0 || novasSecoes.length > 0) && (
                <div className="save-actions-container">
                  <div className="save-actions">
                    <button 
                      className="btn-secondary"
                      onClick={descartarAlteracoes}
                      disabled={saving}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                      Descartar alterações
                    </button>
                    <button 
                      className="btn-outline"
                      onClick={salvarComoRascunho}
                      disabled={saving}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17,21 17,13 7,13 7,21"></polyline>
                        <polyline points="7,3 7,8 15,8"></polyline>
                      </svg>
                      Salvar como Rascunho
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Vista para usuários - conteúdo contínuo sem separação */
            <div className="capitulo-content-continuo">
              {secoesFiltradas.map((secao) => (
                <div key={secao.id} className="secao-content-item">
                  {/* Mostrar título apenas se existir */}
                  {secao.titulo && secao.titulo.trim() !== '' && (
                    <h3 className="secao-titulo-continuo">{secao.titulo}</h3>
                  )}
                  
                  {/* Mostrar resumo se existir */}
                  {secao.resumo && secao.resumo.trim() !== '' && (
                    <div className="secao-resumo-continuo">
                      <p>{secao.resumo}</p>
                    </div>
                  )}
                  
                  {/* Renderizar conteúdo da seção */}
                  {renderSecaoContentUser(secao)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mensagem quando não há seções */}
      {!loading && !error && secoes.length === 0 && (
        <div className="no-results">
          <p>
            {canManageSecoes 
              ? "Nenhuma seção cadastrada. Clique no botão 'Adicionar Seção' para começar!"
              : "Este capítulo ainda não possui conteúdo."
            }
          </p>
        </div>
      )}

      {/* Mensagem quando não há resultados na pesquisa */}
      {!loading && !error && secoes.length > 0 && secoesFiltradas.length === 0 && searchTerm && (
        <div className="no-results">
          <p>Nenhum conteúdo encontrado para "{searchTerm}"</p>
        </div>
      )}

      {/* Mensagem quando não há seções no capítulo */}
      {!loading && !error && secoes.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
          </div>
          <h3>{canManageSecoes ? 'Nenhuma seção encontrada' : 'Capítulo vazio'}</h3>
          <p>{canManageSecoes ? 'Este capítulo ainda não possui seções criadas.' : 'Este capítulo ainda não possui conteúdo disponível.'}</p>
          {canManageSecoes && (
            <button 
              className="btn-primary"
              onClick={adicionarNovaSecao}
              style={{ marginTop: '16px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Criar primeira seção
            </button>
          )}
        </div>
      )}

      {/* Modais */}
      <DeleteSecaoModal
        isOpen={showDeleteSecaoModal}
        onClose={() => setShowDeleteSecaoModal(false)}
        onDelete={handleConfirmDeleteSecao}
        secao={selectedSecao}
      />

      <AddImagemModal
        isOpen={showAddImagemModal}
        onClose={() => setShowAddImagemModal(false)}
        onAdd={handleAddImagemFromModal}
        idSecao={selectedSecaoForImage?.id}
      />

      <ConfirmDiscardModal
        isOpen={showConfirmDiscardModal}
        onClose={() => setShowConfirmDiscardModal(false)}
        onConfirm={confirmarDescarte}
        title="Descartar alterações?"
        message="Tem certeza que deseja descartar todas as alterações não salvas? Esta ação não pode ser desfeita."
        confirmText="Descartar"
        cancelText="Cancelar"
      />

      {/* Botão fixo de salvar */}
      {(secoesEditadas.length > 0 || novasSecoes.length > 0) && (
        <button 
          className={`save-button-fixed ${saving ? 'saving' : ''}`}
          onClick={salvarSecoes}
          disabled={saving}
          title={saving ? 'Salvando alterações...' : 'Salvar todas as alterações'}
        >
          {saving ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"></path>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17,21 17,13 7,13 7,21"></polyline>
              <polyline points="7,3 7,8 15,8"></polyline>
            </svg>
          )}
        </button>
      )}
    </div>
  );
};

export default Secoes;
