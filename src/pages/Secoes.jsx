import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSecoes, createSecao, updateSecao, deleteSecao } from '../services/secaoService';
import { getImagens, createImagem, deleteImagem, fileToBytea } from '../services/imagemService';
import { getCapitulos } from '../services/capituloService';
import { processImageData } from '../utils/imageUtils';
import DeleteSecaoModal from '../components/DeleteSecaoModal';
import AddImagemModal from '../components/AddImagemModal';

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

  const handleUpdateSecao = async (secaoId, field, value) => {
    try {
      const updateData = { [field]: value };
      await updateSecao(secaoId, updateData);
      await fetchSecoes();
    } catch (error) {
      console.error('Erro ao atualizar seção:', error);
      alert('Erro ao atualizar seção. Tente novamente.');
    }
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
        {secao.original && (
          <div className="secao-text">
            <h4>Conteúdo:</h4>
            <textarea
              value={secao.original}
              onChange={(e) => handleUpdateSecao(secao.id, 'original', e.target.value)}
              className="secao-content-input"
              rows="6"
            />
          </div>
        )}

        {/* Campo Link 3D */}
        <div className="secao-link3d">
          <h4>Link 3D:</h4>
          <input
            type="url"
            value={secao.link3d || ''}
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
          <h1>Seções</h1>
          {capitulo && <h2>{capitulo.nome}</h2>}
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
          {/* Seções existentes */}
          {secoesFiltradas.map((secao) => (
            <div 
              key={secao.id} 
              className={`secao-card ${expandedSecao === secao.id ? 'expanded' : ''}`}
              onClick={() => !canManageSecoes && handleExpandSecao(secao.id)}
            >
              {canManageSecoes ? (
                <>
                  <div className="secao-header">
                    <div className="secao-info">
                      <h3 className="secao-titulo">
                        <input
                          type="text"
                          value={secao.titulo || ''}
                          onChange={(e) => handleUpdateSecao(secao.id, 'titulo', e.target.value)}
                          className="secao-titulo-input"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </h3>
                      {secao.resumo && (
                        <p className="secao-resumo">
                          <textarea
                            value={secao.resumo}
                            onChange={(e) => handleUpdateSecao(secao.id, 'resumo', e.target.value)}
                            className="secao-resumo-input"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </p>
                      )}
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
                </>
              ) : (
                <>
                  {/* Mostrar apenas título inicialmente */}
                  <div className="secao-preview">
                    <h3 className="secao-titulo">
                      {secao.titulo || 'Sem título'}
                      <span className={`expand-indicator ${expandedSecao === secao.id ? 'rotated' : ''}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6,9 12,15 18,9"></polyline>
                        </svg>
                      </span>
                    </h3>
                    {secao.resumo && (
                      <p className="secao-resumo">{secao.resumo}</p>
                    )}
                  </div>
                  
                  {/* Mostrar conteúdo completo quando expandido */}
                  {expandedSecao === secao.id && (
                    <div className="secao-expanded-content">
                      {renderSecaoContent(secao)}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Novas seções (edição inline para admins) */}
          {canManageSecoes && novasSecoes.map((secao) => (
            <div key={secao.id} className="secao-card secao-card-nova">
              <div className="secao-header">
                <div className="secao-info">
                  <h3 className="secao-titulo">
                    <input
                      type="text"
                      value={secao.titulo || ''}
                      onChange={(e) => atualizarNovaSecao(secao.id, 'titulo', e.target.value)}
                      className="secao-titulo-input"
                      placeholder="Título da nova seção"
                    />
                  </h3>
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
          {canManageSecoes && (
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
          )}

          {/* Botões de salvar - mostrar quando há alterações */}
          {canManageSecoes && (secoesEditadas.length > 0 || novasSecoes.length > 0) && (
            <div className="save-actions-container">
              <div className="save-actions">
                <button 
                  className="btn-outline"
                  onClick={salvarComoRascunho}
                  disabled={saving}
                >
                  Salvar como Rascunho
                </button>
                <button 
                  className="btn-primary"
                  onClick={salvarSecoes}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Finalizar'}
                </button>
              </div>
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
              : "Nenhuma seção cadastrada."
            }
          </p>
        </div>
      )}

      {/* Mensagem quando não há resultados na pesquisa */}
      {!loading && !error && secoes.length > 0 && secoesFiltradas.length === 0 && searchTerm && (
        <div className="no-results">
          <p>Nenhuma seção encontrada para "{searchTerm}"</p>
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
          <h3>Nenhuma seção encontrada</h3>
          <p>Este capítulo ainda não possui seções criadas.</p>
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
    </div>
  );
};

export default Secoes;
