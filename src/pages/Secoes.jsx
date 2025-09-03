import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSecoes, createSecao, updateSecao, deleteSecao } from '../services/secaoService';
import { getImagens, createImagem, deleteImagem, updateImagem, fileToBytea } from '../services/imagemService';
import { getCapitulos } from '../services/capituloService';
import { processImageData } from '../utils/imageUtils';
import DeleteSecaoModal from '../components/DeleteSecaoModal';
import AddImagemModal from '../components/AddImagemModal';
import ConfirmDiscardModal from '../components/ConfirmDiscardModal';
import '../styles/secaoReorder.css';

const Secoes = () => {
  const { livroId, capituloId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { searchTerm, editMode, setEditMode } = useOutletContext();
  
  // Função utilitária para garantir que URLs tenham protocolo
  const formatUrl = (url) => {
    if (!url || url.trim() === '') return '';
    const trimmedUrl = url.trim();
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl;
    }
    return `https://${trimmedUrl}`;
  };
  
  const [secoes, setSecoes] = useState([]);
  const [secoesOriginais, setSecoesOriginais] = useState([]); // Estado para preservar ordem original
  const [capitulo, setCapitulo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSecao, setExpandedSecao] = useState(null);
  const [secaoImages, setSecaoImages] = useState({});
  const [loadingImages, setLoadingImages] = useState({});
  
  // Estado para notificações
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  
  // Estados para edição inline (sempre ativo para admins)
  const [secoesEditadas, setSecoesEditadas] = useState([]);
  const [novasSecoes, setNovasSecoes] = useState([]);
  const [saving, setSaving] = useState(false);
  
  // Estado para gerenciar imagens temporárias de novas seções
  const [imagensTemporarias, setImagensTemporarias] = useState({});
  const [uploadingImages, setUploadingImages] = useState({});
  
  // Estado para gerenciar edições de imagens existentes
  const [imagensEditadas, setImagensEditadas] = useState({});
  const [reordenandoImagens, setReordenandoImagens] = useState({});
  
  // Estado para controlar imagens marcadas para remoção
  const [imagensMarcadasParaRemocao, setImagensMarcadasParaRemocao] = useState({});
  
  // Estados para reordenação de seções
  const [reordenandoSecoes, setReordenandoSecoes] = useState(false);
  
  // Estado para controlar a visibilidade do botão "voltar ao topo"
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [editModeScrolled, setEditModeScrolled] = useState(false);
  
  // Estados para drag and drop
  const [draggedSecao, setDraggedSecao] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  
  // Estados dos modais (manter apenas para imagens)
  const [showDeleteSecaoModal, setShowDeleteSecaoModal] = useState(false);
  const [showAddImagemModal, setShowAddImagemModal] = useState(false);
  const [showConfirmDiscardModal, setShowConfirmDiscardModal] = useState(false);
  const [selectedSecao, setSelectedSecao] = useState(null);
  const [selectedSecaoForImage, setSelectedSecaoForImage] = useState(null);
  
  // Estado para controlar ações pendentes
  const [pendingAction, setPendingAction] = useState(null);

  // Verificar se o usuário pode gerenciar seções
  const canManageSecoes = user && user.tipoUsuario && user.tipoUsuario.id === 1;

  // Função para mostrar notificações
  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, 5000);
  };

  // Funções para controle do modo de edição
  const hasUnsavedChanges = () => {
    return secoesEditadas.length > 0 || 
           novasSecoes.length > 0 || 
           Object.keys(imagensTemporarias).length > 0 || 
           Object.keys(imagensEditadas).length > 0 || 
           Object.keys(imagensMarcadasParaRemocao).length > 0;
  };

  const exitEditModeAfterSave = () => {
    setEditMode(false);
    localStorage.setItem('editMode', 'false');
    showNotification('success', 'Alterações salvas com sucesso!');
  };

  // Função genérica para lidar com alterações não salvas
  const handleUnsavedChanges = (actionType, actionData = null) => {
    if (hasUnsavedChanges()) {
      setPendingAction({ type: actionType, data: actionData });
      setShowConfirmDiscardModal(true);
      return false; // Bloqueia a ação
    }
    return true; // Permite a ação
  };

  // Executar ação pendente após confirmação
  const executePendingAction = () => {
    if (!pendingAction) return;
    
    const { type, data } = pendingAction;
    
    switch (type) {
      case 'EXIT_EDIT_MODE':
        setEditMode(false);
        localStorage.setItem('editMode', 'false');
        break;
      case 'NAVIGATE_BACK':
        navigate(`/livro/${livroId}/capitulos`);
        break;
      case 'NAVIGATE_TO':
        if (data?.path) {
          navigate(data.path);
        }
        break;
      case 'DISCARD_ONLY':
        // Apenas descartar, não fazer nada mais
        break;
    }
    
    setPendingAction(null);
  };

  // Verificar alterações não salvas ao sair do modo de edição
  useEffect(() => {
    if (!editMode && hasUnsavedChanges()) {
      // Voltar temporariamente ao modo de edição e mostrar modal
      setEditMode(true);
      handleUnsavedChanges('EXIT_EDIT_MODE');
    }
  }, [editMode]);

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
      
      // Salvar cópia das seções originais para comparação no salvamento
      setSecoesOriginais([...secoesOrdenadas]);
      
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
      setSecoesOriginais([]);
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

  // Proteção contra fechamento/navegação da página com alterações não salvas
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Tem certeza que deseja sair?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [secoesEditadas, novasSecoes, imagensTemporarias, imagensEditadas, imagensMarcadasParaRemocao]);

  // Proteção contra navegação via botão voltar do navegador
  useEffect(() => {
    const handlePopState = (e) => {
      if (hasUnsavedChanges()) {
        // Prevenir a navegação
        window.history.pushState(null, '', window.location.pathname);
        // Mostrar modal de confirmação
        handleUnsavedChanges('NAVIGATE_BACK');
      }
    };

    // Se há alterações não salvas, adicionar entrada no histórico para interceptar
    if (hasUnsavedChanges()) {
      window.history.pushState(null, '', window.location.pathname);
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [secoesEditadas, novasSecoes, imagensTemporarias, imagensEditadas, imagensMarcadasParaRemocao]);

  // Controlar visibilidade do botão "voltar ao topo" e posição do edit mode
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.pageYOffset;
      setShowBackToTop(scrollY > 300);
      setEditModeScrolled(scrollY > 100); // Muda posição após 100px de scroll
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filtrar seções baseado na pesquisa
  const secoesFiltradas = (secoes || []).filter(secao => {
    // Se não há termo de pesquisa, mostrar todas
    if (!searchTerm || searchTerm.trim() === '') return true;
    
    return secao.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           secao.resumo?.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => {
    // Ordenar por ordem, depois por ID se ordem for igual
    if (a.ordem !== b.ordem) {
      return a.ordem - b.ordem;
    }
    return a.id - b.id;
  });

  // Função para obter todas as seções ordenadas (existentes + novas)
  const getTodasSecoesOrdenadas = () => {
    const existentes = secoesFiltradas.map(s => ({ ...s, isNew: false }));
    const novas = novasSecoes.map(s => ({ ...s, isNew: true }));
    
    return [...existentes, ...novas].sort((a, b) => a.ordem - b.ordem);
  };

  const handleExpandSecao = (secaoId) => {
    if (expandedSecao === secaoId) {
      setExpandedSecao(null);
    } else {
      setExpandedSecao(secaoId);
      fetchImagensSecao(secaoId);
    }
  };

  const handleVoltar = () => {
    if (handleUnsavedChanges('NAVIGATE_BACK')) {
      navigate(`/livro/${livroId}/capitulos`);
    }
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
      // Buscar a seção original para preservar todos os campos existentes
      const secaoOriginal = secoes.find(s => s.id === secaoId);
      
      // Adicionar nova seção à lista de editadas preservando os campos originais
      setSecoesEditadas(prev => [...prev, {
        id: secaoId,
        titulo: secaoOriginal?.titulo || '',
        resumo: secaoOriginal?.resumo || '',
        original: secaoOriginal?.original || '',
        link3d: secaoOriginal?.link3d || '',
        ordem3d: secaoOriginal?.ordem3d || 1,
        ordem: secaoOriginal?.ordem || 0,
        [field]: value // Sobrescreve o campo sendo editado
      }]);
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
      // Usar um ID único para cada upload para evitar conflitos
      const uploadId = `existing-${secaoId}-${Date.now()}-${Math.random()}`;
      setUploadingImages(prev => ({ ...prev, [uploadId]: true }));
      
      // Converter arquivo para base64 para preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const imagens = secaoImages[secaoId] || [];
        const imagensTemporariasSeccao = imagensTemporarias[`existing-${secaoId}`] || [];
        const totalImagens = imagens.length + imagensTemporariasSeccao.length;
        const novaOrdem = totalImagens > 0 ? Math.max(
          ...imagens.map(img => img.ordem),
          ...imagensTemporariasSeccao.map(img => img.ordem)
        ) + 1 : 1;
        
        const imagemTemporaria = {
          id: `temp-existing-${Date.now()}-${Math.random()}`,
          file: file,
          preview: e.target.result,
          descricao: '',
          content_type: file.type,
          ordem: novaOrdem,
          id_secao: parseInt(secaoId),
          isTemporary: true,
          isNewForExistingSection: true
        };
        
        // Adicionar à lista de imagens temporárias com chave especial para seções existentes
        setImagensTemporarias(prev => ({
          ...prev,
          [`existing-${secaoId}`]: [...(prev[`existing-${secaoId}`] || []), imagemTemporaria]
        }));
        
        // Remover o estado de upload específico
        setUploadingImages(prev => {
          const newState = { ...prev };
          delete newState[uploadId];
          return newState;
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro ao adicionar imagem temporária:', error);
      alert('Erro ao adicionar imagem. Tente novamente.');
      // Limpar estado de upload em caso de erro
      setUploadingImages(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(key => {
          if (key.startsWith(`existing-${secaoId}-`)) {
            delete newState[key];
          }
        });
        return newState;
      });
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

    // Sempre adicionar título e conteúdo original primeiro (se existirem)
    if (secao.titulo && secao.titulo.trim() !== '') {
      items.push({
        type: 'titulo',
        content: secao.titulo,
        ordem: 0 // Título sempre primeiro
      });
    }

    if (secao.original && secao.original.trim() !== '') {
      items.push({
        type: 'original',
        content: secao.original,
        ordem: 1 // Conteúdo sempre após título
      });
    }

    // Adicionar imagens se existirem (ordem 2+)
    const imagens = secaoImages[secao.id] || [];
    if (imagens.length > 0) {
      imagens.forEach(imagem => {
        items.push({
          type: 'imagem',
          content: imagem,
          ordem: imagem.ordem + 1 // Offset para vir após título e conteúdo
        });
      });
    }

    // Adicionar link 3D se existir (ordem configurável, mas sempre após conteúdo)
    if (secao.link3d && secao.link3d.trim() !== '') {
      const ordem3d = secao.ordem3d || 1; // Padrão: ordem 1 (após o conteúdo)
      items.push({
        type: 'link3d',
        content: secao.link3d,
        ordem: ordem3d
      });
    }

    // Ordenar items por ordem
    items.sort((a, b) => a.ordem - b.ordem);

    return (
      <div className="secao-content-user">
        {items.map((item, index) => (
          <div key={`${item.type}-${index}`} className="secao-content-element">
            {item.type === 'titulo' && (
              <h3 className="secao-titulo-inline">{item.content}</h3>
            )}
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
                  href={formatUrl(item.content)} 
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
                <a href={formatUrl(item.content)} target="_blank" rel="noopener noreferrer">
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

        {/* Campo Link 3D com melhor organização */}
        <div className="secao-link3d">
          <h4>Link 3D (opcional):</h4>
          <div className="link3d-container">
            <input
              type="url"
              value={getSecaoValue(secao.id, 'link3d') || ''}
              onChange={(e) => handleUpdateSecao(secao.id, 'link3d', e.target.value)}
              className="secao-link3d-input"
              placeholder="https://exemplo.com/modelo-3d"
            />
            {getSecaoValue(secao.id, 'link3d') && (
              <div className="link3d-order">
                <label>Posição do Link 3D:</label>
                <select
                  value={getSecaoValue(secao.id, 'ordem3d') || 1}
                  onChange={(e) => handleUpdateSecao(secao.id, 'ordem3d', parseInt(e.target.value))}
                  className="order-select"
                >
                  <option value={1}>Após o conteúdo</option>
                  <option value={99}>No final (após todas as imagens)</option>
                </select>
                <small>Define onde o link 3D aparecerá no conteúdo</small>
              </div>
            )}
          </div>
        </div>

        <div className="secao-imagens">
          <div className="imagens-header">
            <h4>Imagens:</h4>
            <label className="add-image-button">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  files.forEach(file => handleAddImagem(secao.id, file));
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Adicionar Imagem
            </label>
          </div>
          
          {loadingImages[secao.id] || Object.keys(uploadingImages).some(key => key.startsWith(`existing-${secao.id}-`)) ? (
            <p>Carregando imagens...</p>
          ) : (
            <div className="imagens-grid">
              {/* Imagens existentes */}
              {secaoImages[secao.id]?.map(imagem => renderImageWithControls(imagem, secao.id))}
              
              {/* Imagens temporárias para seção existente */}
              {imagensTemporarias[`existing-${secao.id}`]?.map((imagem, originalIndex) => {
                const marcadaParaRemocao = imagensMarcadasParaRemocao[`existing-${secao.id}`]?.includes(imagem.id);
                if (marcadaParaRemocao) return null;
                
                // Calcular índice real considerando apenas imagens visíveis
                const imagensVisiveis = imagensTemporarias[`existing-${secao.id}`].filter(img => 
                  !imagensMarcadasParaRemocao[`existing-${secao.id}`]?.includes(img.id)
                );
                const indexVisivel = imagensVisiveis.findIndex(img => img.id === imagem.id);
                
                return (
                <div key={imagem.id} className="imagem-temporaria">
                  <div className="image-preview">
                    <img 
                      src={imagem.preview} 
                      alt={imagem.descricao}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <button 
                      className="delete-temp-image-button"
                      onClick={() => removerImagemTemporaria(`existing-${secao.id}`, imagem.id)}
                      title="Remover imagem"
                    >
                      ×
                    </button>
                  </div>
                  <div className="image-info">
                    <input
                      type="text"
                      value={imagem.descricao}
                      onChange={(e) => {
                        setImagensTemporarias(prev => ({
                          ...prev,
                          [`existing-${secao.id}`]: prev[`existing-${secao.id}`].map(img => 
                            img.id === imagem.id ? { ...img, descricao: e.target.value } : img
                          )
                        }));
                      }}
                      placeholder="Descrição da imagem"
                      className="image-description-input"
                    />
                    <div className="image-order">
                      <span>Ordem: {imagem.ordem}</span>
                      {indexVisivel > 0 && (
                        <button
                          type="button"
                          onClick={() => reordenarImagensTemporarias(`existing-${secao.id}`, originalIndex, originalIndex - 1)}
                          className="order-button"
                          title="Mover para cima"
                        >
                          ↑
                        </button>
                      )}
                      {indexVisivel < imagensVisiveis.length - 1 && (
                        <button
                          type="button"
                          onClick={() => reordenarImagensTemporarias(`existing-${secao.id}`, originalIndex, originalIndex + 1)}
                          className="order-button"
                          title="Mover para baixo"
                        >
                          ↓
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}

              {(() => {
                const imagensExistentes = secaoImages[secao.id] || [];
                const imagensTemporariasSeccao = imagensTemporarias[`existing-${secao.id}`] || [];
                const imagensMarcadas = imagensMarcadasParaRemocao[`existing-${secao.id}`] || [];
                
                // Filtrar imagens existentes que não estão marcadas para remoção
                const imagensExistentesVisiveis = imagensExistentes.filter(img => 
                  !imagensMarcadas.includes(`saved-${img.id}`)
                );
                
                // Filtrar imagens temporárias que não estão marcadas para remoção  
                const imagensTemporariasVisiveis = imagensTemporariasSeccao.filter(img => 
                  !imagensMarcadas.includes(img.id)
                );
                
                return (imagensExistentesVisiveis.length === 0 && imagensTemporariasVisiveis.length === 0) && (
                  <p className="no-images">Nenhuma imagem adicionada</p>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Funções para gerenciar edições de imagens existentes
  const atualizarDescricaoImagem = (imagemId, novaDescricao) => {
    setImagensEditadas(prev => ({
      ...prev,
      [imagemId]: {
        ...prev[imagemId],
        descricao: novaDescricao
      }
    }));
  };

  const reordenarImagensExistentes = async (secaoId, startIndex, endIndex) => {
    const imagens = [...(secaoImages[secaoId] || [])];
    const [removed] = imagens.splice(startIndex, 1);
    imagens.splice(endIndex, 0, removed);
    
    // Atualizar ordens
    const imagensComNovaOrdem = imagens.map((img, index) => ({
      ...img,
      ordem: index + 1
    }));
    
    try {
      setReordenandoImagens(prev => ({ ...prev, [secaoId]: true }));
      
      // Atualizar todas as imagens com nova ordem
      for (const imagem of imagensComNovaOrdem) {
        await updateImagem(imagem.id, { ordem: imagem.ordem });
      }
      
      // Recarregar imagens da seção
      await fetchImagensSecao(secaoId, true);
    } catch (error) {
      console.error('Erro ao reordenar imagens:', error);
      alert('Erro ao reordenar imagens. Tente novamente.');
    } finally {
      setReordenandoImagens(prev => ({ ...prev, [secaoId]: false }));
    }
  };

  const salvarDescricaoImagem = async (imagemId) => {
    const imagemEditada = imagensEditadas[imagemId];
    if (!imagemEditada) return;
    
    try {
      await updateImagem(imagemId, { descricao: imagemEditada.descricao });
      
      // Atualizar o cache local
      setSecaoImages(prev => {
        const newImages = { ...prev };
        Object.keys(newImages).forEach(secaoId => {
          newImages[secaoId] = newImages[secaoId].map(img => 
            img.id === imagemId 
              ? { ...img, descricao: imagemEditada.descricao }
              : img
          );
        });
        return newImages;
      });
      
      // Limpar edição
      setImagensEditadas(prev => {
        const newEditadas = { ...prev };
        delete newEditadas[imagemId];
        return newEditadas;
      });
    } catch (error) {
      console.error('Erro ao salvar descrição da imagem:', error);
      alert('Erro ao salvar descrição. Tente novamente.');
    }
  };

  // Função para renderizar imagem com controles (para seções existentes)
  const renderImageWithControls = (imagem, secaoId) => {
    const processedImage = processImageData(imagem);
    const imagemEditada = imagensEditadas[imagem.id];
    const descricaoAtual = imagemEditada?.descricao ?? imagem.descricao;
    const foiEditada = imagemEditada && imagemEditada.descricao !== imagem.descricao;
    const imagens = secaoImages[secaoId] || [];
    const currentIndex = imagens.findIndex(img => img.id === imagem.id);
    
    // Verificar se a imagem está marcada para remoção
    const marcadaParaRemocao = imagensMarcadasParaRemocao[`existing-${secaoId}`]?.includes(`saved-${imagem.id}`);
    if (marcadaParaRemocao) return null;
    
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
      <div key={imagem.id} className="imagem-existente">
        <div className="image-preview">
          <img 
            src={processedImage.src} 
            alt={processedImage.descricao} 
            onError={(e) => {
              console.error('Erro ao carregar imagem:', e);
              e.target.style.display = 'none';
            }}
          />
          <button 
            className="delete-image-button"
            onClick={() => marcarImagemExistenteParaRemocao(imagem.id, secaoId)}
            title="Remover imagem"
          >
            ×
          </button>
        </div>
        <div className="image-info">
          <div className="image-description-container">
            <input
              type="text"
              value={descricaoAtual || ''}
              onChange={(e) => atualizarDescricaoImagem(imagem.id, e.target.value)}
              placeholder="Descrição da imagem"
              className="image-description-input"
            />
            {foiEditada && (
              <button
                className="save-description-button"
                onClick={() => salvarDescricaoImagem(imagem.id)}
                title="Salvar descrição"
              >
                ✓
              </button>
            )}
          </div>
          <div className="image-order">
            <span>Ordem: {imagem.ordem}</span>
            {currentIndex > 0 && (
              <button
                type="button"
                onClick={() => reordenarImagensExistentes(secaoId, currentIndex, currentIndex - 1)}
                className="order-button"
                title="Mover para cima"
                disabled={reordenandoImagens[secaoId]}
              >
                ↑
              </button>
            )}
            {currentIndex < imagens.length - 1 && (
              <button
                type="button"
                onClick={() => reordenarImagensExistentes(secaoId, currentIndex, currentIndex + 1)}
                className="order-button"
                title="Mover para baixo"
                disabled={reordenandoImagens[secaoId]}
              >
                ↓
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };
  const renderImagensTemporarias = (secaoId) => {
    const imagens = imagensTemporarias[secaoId] || [];
    const isUploading = uploadingImages[secaoId];
    const imagensFiltradas = imagens.filter(img => 
      !imagensMarcadasParaRemocao[secaoId]?.includes(img.id)
    );
    
    return (
      <div className="secao-imagens-temporarias">
        <div className="imagens-header">
          <h4>Imagens:</h4>
          <label className="add-image-button">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files);
                files.forEach(file => adicionarImagemTemporaria(secaoId, file));
                e.target.value = '';
              }}
              style={{ display: 'none' }}
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Adicionar Imagem
          </label>
        </div>
        
        {isUploading && (
          <p className="uploading-message">Processando imagem...</p>
        )}
        
        <div className="imagens-grid-temp">
          {imagensFiltradas.map((imagem, index) => {
            return (
            <div key={imagem.id} className="imagem-temporaria">
              <div className="image-preview">
                <img 
                  src={imagem.preview} 
                  alt={imagem.descricao}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <button 
                  className="delete-temp-image-button"
                  onClick={() => removerImagemTemporaria(secaoId, imagem.id)}
                  title="Remover imagem"
                >
                  ×
                </button>
              </div>
              <div className="image-info">
                <input
                  type="text"
                  value={imagem.descricao}
                  onChange={(e) => {
                    setImagensTemporarias(prev => ({
                      ...prev,
                      [secaoId]: prev[secaoId].map(img => 
                        img.id === imagem.id ? { ...img, descricao: e.target.value } : img
                      )
                    }));
                  }}
                  placeholder="Descrição da imagem"
                  className="image-description-input"
                />
                <div className="image-order">
                  <span>Posição: {imagem.ordem}</span>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        // Encontrar índice original
                        const originalIndex = imagens.findIndex(img => img.id === imagem.id);
                        reordenarImagensTemporarias(secaoId, originalIndex, originalIndex - 1);
                      }}
                      className="order-button"
                      title="Mover para cima"
                    >
                      ↑
                    </button>
                  )}
                  {index < imagensFiltradas.length - 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        // Encontrar índice original
                        const originalIndex = imagens.findIndex(img => img.id === imagem.id);
                        reordenarImagensTemporarias(secaoId, originalIndex, originalIndex + 1);
                      }}
                      className="order-button"
                      title="Mover para baixo"
                    >
                      ↓
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })}
          {imagensFiltradas.length === 0 && !isUploading && (
            <p className="no-images-temp">Nenhuma imagem adicionada</p>
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

  // Nova função para marcar imagens existentes para remoção (não apagar imediatamente)
  const marcarImagemExistenteParaRemocao = (imagemId, secaoId) => {
    setImagensMarcadasParaRemocao(prev => ({
      ...prev,
      [`existing-${secaoId}`]: [...(prev[`existing-${secaoId}`] || []), `saved-${imagemId}`]
    }));
  };

  // Funções para reordenação de seções
  const reordenarSecoes = async (startIndex, endIndex) => {
    if (startIndex === endIndex) return;
    
    try {
      setReordenandoSecoes(true);
      
      // Trabalhar apenas com os dados originais das seções filtradas
      const secoesReordenadas = [...secoesFiltradas];
      const [removedSecao] = secoesReordenadas.splice(startIndex, 1);
      secoesReordenadas.splice(endIndex, 0, removedSecao);
      
      // Atualizar apenas as ordens no estado original (sem tocar nos outros campos)
      setSecoes(prev => {
        const todasSecoes = [...prev];
        
        secoesReordenadas.forEach((secao, index) => {
          const secaoIndex = todasSecoes.findIndex(s => s.id === secao.id);
          if (secaoIndex !== -1) {
            // APENAS atualizar a ordem, mantendo todos os outros campos originais intactos
            todasSecoes[secaoIndex] = { 
              ...todasSecoes[secaoIndex], 
              ordem: index + 1 
            };
          }
        });
        
        return todasSecoes;
      });
      
      // ATUALIZAR seções editadas: incluir todas as seções que tiveram ordem alterada
      const novasSecoesEditadas = [...secoesEditadas];
      
      secoesReordenadas.forEach((secao, index) => {
        const novaOrdem = index + 1;
        const secaoOriginal = secoesOriginais.find(s => s.id === secao.id);
        
        // Se a ordem mudou em relação à original, precisa marcar para salvamento
        if (secaoOriginal && secaoOriginal.ordem !== novaOrdem) {
          const secaoEditadaIndex = novasSecoesEditadas.findIndex(s => s.id === secao.id);
          
          if (secaoEditadaIndex >= 0) {
            // Atualizar seção já em edição - PRESERVAR todos os campos existentes
            novasSecoesEditadas[secaoEditadaIndex] = {
              ...novasSecoesEditadas[secaoEditadaIndex],
              ordem: novaOrdem
            };
          } else {
            // Adicionar nova seção à lista de editadas
            // IMPORTANTE: Preservar todos os valores atuais da seção do estado 'secoes'
            const secaoAtual = secoes.find(s => s.id === secao.id);
            if (secaoAtual) {
              novasSecoesEditadas.push({
                id: secao.id,
                titulo: secaoAtual.titulo,
                resumo: secaoAtual.resumo,
                original: secaoAtual.original,
                link3d: secaoAtual.link3d,
                ordem3d: secaoAtual.ordem3d,
                ordem: novaOrdem // Apenas a ordem é diferente
              });
            }
          }
        }
      });
      
      setSecoesEditadas(novasSecoesEditadas);
      
    } catch (error) {
      console.error('❌ Erro ao reordenar seções:', error);
      // Recarregar seções em caso de erro
      await fetchSecoes();
    } finally {
      setReordenandoSecoes(false);
    }
  };

  const moverSecao = (secaoIndex, direcao) => {
    // Esta função agora é apenas um wrapper para compatibilidade
    // Mas não deveria ser chamada com o novo sistema unificado
    console.warn('moverSecao chamada - usando sistema legado');
    const totalSecoes = secoesFiltradas.length;
    let newIndex;
    
    if (direcao === 'up') {
      newIndex = secaoIndex === 0 ? totalSecoes - 1 : secaoIndex - 1;
    } else {
      newIndex = secaoIndex === totalSecoes - 1 ? 0 : secaoIndex + 1;
    }
    
    // Usar reordenação segura
    if (secoesFiltradas[secaoIndex] && secoesFiltradas[newIndex]) {
      moverSecaoUnificada(secoesFiltradas[secaoIndex].id, false, direcao);
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
    // Remover também as imagens temporárias desta seção
    setImagensTemporarias(prev => {
      const newImages = { ...prev };
      delete newImages[secaoId];
      return newImages;
    });
    // Remover também as marcações de remoção desta seção
    setImagensMarcadasParaRemocao(prev => {
      const newMarcacoes = { ...prev };
      delete newMarcacoes[secaoId];
      return newMarcacoes;
    });
  };

  // Função unificada para mover qualquer seção (existente ou nova) - para setas
  const moverSecaoUnificada = (secaoId, isNew, direcao) => {
    // Criar lista unificada de todas as seções ordenadas
    const todasAsSecoes = getTodasSecoesOrdenadas();

    const secaoAtualIndex = todasAsSecoes.findIndex(s => 
      (isNew && s.isNew && s.id === secaoId) || 
      (!isNew && !s.isNew && s.id === secaoId)
    );

    if (secaoAtualIndex === -1) return;

    // Determinar nova posição (com movimentação circular)
    let newIndex;
    if (direcao === 'up') {
      newIndex = secaoAtualIndex === 0 ? todasAsSecoes.length - 1 : secaoAtualIndex - 1;
    } else {
      newIndex = secaoAtualIndex === todasAsSecoes.length - 1 ? 0 : secaoAtualIndex + 1;
    }

    // Usar a função de reordenação unificada
    reordenarSecoesUnificada(secaoAtualIndex, newIndex);
  };

  // Função para reordenar seções (tanto para setas quanto drag and drop)
  const reordenarSecoesUnificada = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;

    const todasAsSecoes = getTodasSecoesOrdenadas();
    
    // Criar nova lista reordenada
    const secoesReordenadas = [...todasAsSecoes];
    const [secaoMovida] = secoesReordenadas.splice(fromIndex, 1);
    secoesReordenadas.splice(toIndex, 0, secaoMovida);

    // Atualizar as ordens de todas as seções afetadas
    secoesReordenadas.forEach((secao, index) => {
      const novaOrdem = index + 1;
      
      if (secao.isNew) {
        // Atualizar nova seção
        setNovasSecoes(prev => prev.map(s => 
          s.id === secao.id ? { ...s, ordem: novaOrdem } : s
        ));
      } else {
        // Atualizar seção existente
        setSecoes(prev => prev.map(s => 
          s.id === secao.id ? { ...s, ordem: novaOrdem } : s
        ));
        
        // Marcar para salvamento se a ordem mudou
        const secaoOriginal = secoesOriginais.find(s => s.id === secao.id);
        if (secaoOriginal && secaoOriginal.ordem !== novaOrdem) {
          const jaEditada = secoesEditadas.find(s => s.id === secao.id);
          if (!jaEditada) {
            setSecoesEditadas(prev => [...prev, {
              ...secao,
              ordem: novaOrdem
            }]);
          } else {
            setSecoesEditadas(prev => prev.map(s => 
              s.id === secao.id ? { ...s, ordem: novaOrdem } : s
            ));
          }
        }
      }
    });
  };

  // Funções para drag and drop unificadas
  const handleDragStartNovaSecao = (e, novaSecao, index) => {
    const todasSecoes = getTodasSecoesOrdenadas();
    const realIndex = todasSecoes.findIndex(s => s.id === novaSecao.id && s.isNew);
    setDraggedSecao({ secao: novaSecao, index: realIndex, isNew: true });
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');
  };

  const handleDragStart = (e, secao, index) => {
    const todasSecoes = getTodasSecoesOrdenadas();
    const realIndex = todasSecoes.findIndex(s => s.id === secao.id && !s.isNew);
    setDraggedSecao({ secao, index: realIndex, isNew: false });
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedSecao && draggedSecao.index !== dropIndex) {
      reordenarSecoesUnificada(draggedSecao.index, dropIndex);
    }
    
    setDraggedSecao(null);
    setDragOverIndex(null);
    
    const draggedElement = document.querySelector('.dragging');
    if (draggedElement) {
      draggedElement.classList.remove('dragging');
    }
  };

  const handleDragEnd = (e) => {
    setDraggedSecao(null);
    setDragOverIndex(null);
    e.target.classList.remove('dragging');
  };

  // Funções para gerenciar imagens temporárias de novas seções
  const adicionarImagemTemporaria = async (secaoId, file) => {
    try {
      setUploadingImages(prev => ({ ...prev, [secaoId]: true }));
      
      // Converter arquivo para base64 para preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const imagemTemporaria = {
          id: `temp-${Date.now()}-${Math.random()}`,
          file: file,
          preview: e.target.result,
          descricao: '',
          content_type: file.type,
          ordem: (imagensTemporarias[secaoId] || []).length + 1,
          isTemporary: true
        };
        
        setImagensTemporarias(prev => ({
          ...prev,
          [secaoId]: [...(prev[secaoId] || []), imagemTemporaria]
        }));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro ao adicionar imagem temporária:', error);
      alert('Erro ao adicionar imagem. Tente novamente.');
    } finally {
      setUploadingImages(prev => ({ ...prev, [secaoId]: false }));
    }
  };

  const removerImagemTemporaria = (secaoId, imagemId) => {
    // Marcar imagem para remoção ao invés de removê-la imediatamente
    setImagensMarcadasParaRemocao(prev => ({
      ...prev,
      [secaoId]: [...(prev[secaoId] || []), imagemId]
    }));
  };

  const reordenarImagensTemporarias = (secaoId, startIndex, endIndex) => {
    setImagensTemporarias(prev => {
      const imagensSecao = [...(prev[secaoId] || [])];
      const [removed] = imagensSecao.splice(startIndex, 1);
      imagensSecao.splice(endIndex, 0, removed);
      
      // Atualizar ordens
      const imagensComNovaOrdem = imagensSecao.map((img, index) => ({
        ...img,
        ordem: index + 1
      }));
      
      return {
        ...prev,
        [secaoId]: imagensComNovaOrdem
      };
    });
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
      
      let secoesAdicionadas = 0;
      let secoesModificadas = 0;  // Renomeado para evitar colisão
      let secoesRemovidas = 0;
      let imagensAdicionadas = 0;
      let imagensRemovidas = 0;
      
      // Salvar alterações nas seções existentes
      for (const secaoEditada of secoesEditadas) {
        const secaoOriginal = secoesOriginais.find(s => s.id === secaoEditada.id);
        
        if (secaoOriginal) {
          // Verificar se há mudanças específicas nos campos importantes
          const tituloMudou = secaoOriginal.titulo !== secaoEditada.titulo;
          const resumoMudou = secaoOriginal.resumo !== secaoEditada.resumo;
          const originalMudou = secaoOriginal.original !== secaoEditada.original;
          const link3dMudou = secaoOriginal.link3d !== secaoEditada.link3d;
          const ordem3dMudou = secaoOriginal.ordem3d !== secaoEditada.ordem3d;
          
          // Comparação mais rigorosa da ordem
          const ordemOriginal = Number(secaoOriginal.ordem);
          const ordemEditada = Number(secaoEditada.ordem);
          const ordemMudou = ordemOriginal !== ordemEditada;
          
          const temMudancas = tituloMudou || resumoMudou || originalMudou || link3dMudou || ordem3dMudou || ordemMudou;
          
          if (temMudancas) {
            try {
              await updateSecao(secaoEditada.id, secaoEditada);
              secoesModificadas++;  // Usando a variável renomeada
            } catch (updateError) {
              console.error(`Erro ao salvar seção ${secaoEditada.id}:`, updateError);
              throw updateError;
            }
          }
        }
      }
      
      // Salvar alterações nas descrições das imagens
      for (const [imagemId, dadosEditados] of Object.entries(imagensEditadas)) {
        try {
          await updateImagem(imagemId, { descricao: dadosEditados.descricao });
        } catch (imgError) {
          console.error('Erro ao salvar descrição da imagem:', imgError);
          // Continua salvando outras alterações mesmo se uma falhar
        }
      }
      
      // Salvar novas imagens para seções existentes
      const secoesComImagensNovas = [];
      for (const [chave, imagensTemp] of Object.entries(imagensTemporarias)) {
        if (chave.startsWith('existing-')) {
          const secaoId = chave.replace('existing-', '');
          const imagensParaRemover = imagensMarcadasParaRemocao[chave] || [];
          
          for (const imagemTemp of imagensTemp) {
            // Pular imagens marcadas para remoção
            if (imagensParaRemover.includes(imagemTemp.id)) continue;
            
            try {
              const byteaContent = await fileToBytea(imagemTemp.file);
              const imagemData = {
                conteudo: Array.from(byteaContent),
                content_type: imagemTemp.content_type,
                descricao: imagemTemp.descricao,
                ordem: imagemTemp.ordem,
                id_secao: parseInt(secaoId)
              };
              await createImagem(imagemData);
              imagensAdicionadas++;
              
              // Marcar seção para recarregar imagens
              if (!secoesComImagensNovas.includes(secaoId)) {
                secoesComImagensNovas.push(secaoId);
              }
            } catch (imgError) {
              console.error('Erro ao salvar imagem para seção existente:', imgError);
              // Continua salvando outras imagens mesmo se uma falhar
            }
          }
        }
      }
      
      // Processar remoções de imagens marcadas para seções existentes
      for (const [chave, imagensMarcadas] of Object.entries(imagensMarcadasParaRemocao)) {
        if (chave.startsWith('existing-')) {
          const secaoId = chave.replace('existing-', '');
          
          for (const imagemMarcada of imagensMarcadas) {
            if (imagemMarcada.startsWith('saved-')) {
              const imagemId = imagemMarcada.replace('saved-', '');
              try {
                await deleteImagem(parseInt(imagemId));
                imagensRemovidas++;
                
                // Marcar seção para recarregar imagens
                if (!secoesComImagensNovas.includes(secaoId)) {
                  secoesComImagensNovas.push(secaoId);
                }
              } catch (imgError) {
                console.error('Erro ao remover imagem:', imgError);
                // Continua removendo outras imagens mesmo se uma falhar
              }
            }
          }
        }
      }
      
      // Criar novas seções com suas imagens
      for (const novaSecao of novasSecoes) {
        const { id, isNew, ...secaoData } = novaSecao;
        
        // Criar a seção primeiro
        const secaoCriada = await createSecao(secaoData);
        const secaoId = secaoCriada.id;
        secoesAdicionadas++;
        
        // Se há imagens temporárias para esta seção, criá-las
        const imagensSecao = imagensTemporarias[id] || [];
        const imagensParaRemover = imagensMarcadasParaRemocao[id] || [];
        
        for (const imagemTemp of imagensSecao) {
          // Pular imagens marcadas para remoção
          if (imagensParaRemover.includes(imagemTemp.id)) continue;
          
          try {
            const byteaContent = await fileToBytea(imagemTemp.file);
            const imagemData = {
              conteudo: Array.from(byteaContent),
              content_type: imagemTemp.content_type,
              descricao: imagemTemp.descricao,
              ordem: imagemTemp.ordem,
              id_secao: secaoId
            };
            await createImagem(imagemData);
            imagensAdicionadas++;
          } catch (imgError) {
            console.error('Erro ao salvar imagem:', imgError);
            // Continua salvando outras imagens mesmo se uma falhar
          }
        }
      }
      
      // Recarregar seções
      await fetchSecoes();
      
      // Recarregar imagens das seções que tiveram mudanças
      for (const secaoId of secoesComImagensNovas) {
        await fetchImagensSecao(secaoId, true);
      }
      
      // Limpar estados de edição
      setSecoesEditadas([]);
      setNovasSecoes([]);
      setImagensTemporarias({});
      setImagensEditadas({});
      setImagensMarcadasParaRemocao({});
      
      // Mostrar notificação de sucesso
      let mensagem = 'Alterações salvas com sucesso!';
      const detalhes = [];
      
      if (secoesAdicionadas > 0) detalhes.push(`${secoesAdicionadas} seção(ões) criada(s)`);
      if (secoesModificadas > 0) detalhes.push(`${secoesModificadas} seção(ões) editada(s)`);
      if (imagensAdicionadas > 0) detalhes.push(`${imagensAdicionadas} imagem(ns) adicionada(s)`);
      if (imagensRemovidas > 0) detalhes.push(`${imagensRemovidas} imagem(ns) removida(s)`);
      
      if (detalhes.length > 0) {
        mensagem = `Sucesso! ${detalhes.join(', ')}.`;
      }
      
      exitEditModeAfterSave();
      showNotification('success', mensagem);
      
    } catch (error) {
      console.error('Erro ao salvar seções:', error);
      showNotification('error', 'Erro ao salvar alterações: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmarDescarte = () => {
    // Limpar todas as alterações pendentes
    setSecoesEditadas([]);
    setNovasSecoes([]);
    setImagensTemporarias({});
    setImagensEditadas({});
    setImagensMarcadasParaRemocao({});
    
    // Restaurar ordem original das seções
    if (secoesOriginais.length > 0) {
      setSecoes([...secoesOriginais]);
    }
    
    // Fechar o modal
    setShowConfirmDiscardModal(false);
    
    // Executar a ação pendente (se houver)
    executePendingAction();
  };

  const cancelarDescarte = () => {
    // Fechar o modal e limpar ação pendente
    setShowConfirmDiscardModal(false);
    setPendingAction(null);
  };

  // Função para navegação protegida (pode ser chamada de qualquer lugar)
  const navigateWithUnsavedCheck = (path) => {
    if (handleUnsavedChanges('NAVIGATE_TO', { path })) {
      navigate(path);
    }
  };

  const salvarComoRascunho = async () => {
    // TODO: Implementar lógica para criar capítulo de rascunho
    console.log('ℹ️ Funcionalidade de rascunho será implementada em breve');
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
      
      showNotification('success', 'Seção removida com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar seção:', error);
      showNotification('error', 'Erro ao remover seção. Tente novamente.');
      throw error;
    }
  };

  const handleAddImagemModal = (secao) => {
    setSelectedSecaoForImage(secao);
    setShowAddImagemModal(true);
  };

  return (
    <div className="secoes-container">
      {/* Notificação */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            {notification.type === 'success' && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"></path>
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
            )}
            {notification.type === 'error' && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            )}
            <span>{notification.message}</span>
            <button 
              className="notification-close"
              onClick={() => setNotification({ show: false, type: '', message: '' })}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}

        {/* Header com botão voltar */}
        <div className="secoes-header">
          <div className="header-left">
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
        </div>      {/* Loading state */}
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
        <>
          <div className="secoes-list">
            {canManageSecoes && editMode ? (
              /* Modo de edição para admins - Renderizar todas as seções em ordem unificada */
              <>
                {getTodasSecoesOrdenadas().map((secao, index) => (
                  secao.isNew ? (
                    // Nova seção
                    <div 
                      key={secao.id} 
                      className={`secao-card expanded ${reordenandoSecoes ? 'reordering' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                      draggable={!reordenandoSecoes}
                      onDragStart={(e) => handleDragStartNovaSecao(e, secao, index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverIndex(index);
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          setDragOverIndex(null);
                        }
                      }}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={(e) => {
                        setDraggedSecao(null);
                        setDragOverIndex(null);
                        e.target.classList.remove('dragging');
                      }}
                    >
                      <div className="secao-header-controls">
                        {/* Controles de reordenação funcionais para novas seções */}
                        <div className="secao-reorder-controls">
                          <div className="drag-handle" title="Arrastar para reordenar">
                            ⋮⋮
                          </div>
                          <button
                            className="reorder-button"
                            title="Mover seção para cima"
                            onClick={() => moverSecaoUnificada(secao.id, true, 'up')}
                            disabled={reordenandoSecoes}
                          >
                            ↑
                          </button>
                          <button
                            className="reorder-button"
                            title="Mover seção para baixo"
                            onClick={() => moverSecaoUnificada(secao.id, true, 'down')}
                            disabled={reordenandoSecoes}
                          >
                            ↓
                          </button>
                        </div>

                        <div className="secao-main-content">
                          <div className="secao-field optional">
                            <label>Título da seção</label>
                            <input
                              type="text"
                              value={secao.titulo || ''}
                              onChange={(e) => atualizarNovaSecao(secao.id, 'titulo', e.target.value)}
                              placeholder="Ex: Introdução, Conceitos básicos..."
                              className="secao-titulo-input"
                            />
                          </div>

                          <div className="secao-field optional">
                            <label>Resumo</label>
                            <textarea
                              value={secao.resumo || ''}
                              onChange={(e) => atualizarNovaSecao(secao.id, 'resumo', e.target.value)}
                              placeholder="Gerado por IA (sera implementado em breve)"
                              className="secao-resumo-input"
                              rows="2"
                            />
                          </div>
                        </div>

                        <div className="secao-actions">
                          <button
                            className="action-button delete"
                            onClick={() => removerNovaSecao(secao.id)}
                            title="Remover nova seção"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="secao-content">
                        <div className="secao-field">
                          <label>Conteúdo</label>
                          <textarea
                            value={secao.original || ''}
                            onChange={(e) => atualizarNovaSecao(secao.id, 'original', e.target.value)}
                            className="secao-content-input"
                            rows="6"
                            placeholder="Digite o conteúdo da seção"
                          />
                        </div>

                        {/* Campo Link 3D com melhor organização */}
                        <div className="secao-field optional">
                          <label>Link 3D</label>
                          <input
                            type="url"
                            value={secao.link3d || ''}
                            onChange={(e) => atualizarNovaSecao(secao.id, 'link3d', e.target.value)}
                            className="secao-link3d-input"
                            placeholder="https://exemplo.com/modelo-3d"
                          />
                          {secao.link3d && (
                            <div className="link3d-order">
                              <label>Posição do Link 3D:</label>
                              <select
                                value={secao.ordem3d || 1}
                                onChange={(e) => atualizarNovaSecao(secao.id, 'ordem3d', parseInt(e.target.value))}
                                className="order-select"
                              >
                                <option value={1}>Após o conteúdo</option>
                                <option value={99}>No final (após todas as imagens)</option>
                              </select>
                              <small>Define onde o link 3D aparecerá no conteúdo</small>
                            </div>
                          )}
                        </div>

                        {renderImagensTemporarias(secao.id)}
                      </div>
                    </div>
                  ) : (
                    // Seção existente
                    <div 
                      key={secao.id} 
                      className={`secao-card ${expandedSecao === secao.id ? 'expanded' : ''} ${secoesEditadas.find(s => s.id === secao.id) ? 'secao-editada' : ''} ${reordenandoSecoes ? 'reordering' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                      draggable={!reordenandoSecoes}
                      onDragStart={(e) => handleDragStart(e, secao, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="secao-header-controls">
                        {/* Controles de reordenação mais intuitivos */}
                        <div className="secao-reorder-controls">
                          <div className="drag-handle" title="Arrastar para reordenar">
                            ⋮⋮
                          </div>
                          <button
                            className="reorder-button"
                            title="Mover seção para cima"
                            onClick={() => moverSecaoUnificada(secao.id, false, 'up')}
                            disabled={reordenandoSecoes}
                          >
                            ↑
                          </button>
                          <button
                            className="reorder-button"
                            title="Mover seção para baixo"
                            onClick={() => moverSecaoUnificada(secao.id, false, 'down')}
                            disabled={reordenandoSecoes}
                          >
                            ↓
                          </button>
                        </div>

                        {/* Conteúdo principal da seção */}
                        <div className="secao-main-content">
                          <div className="secao-field optional">
                            <label>Título da seção</label>
                            <input
                              type="text"
                              value={getSecaoValue(secao.id, 'titulo') || ''}
                              onChange={(e) => handleUpdateSecao(secao.id, 'titulo', e.target.value)}
                              placeholder="Ex: Introdução, Conceitos básicos..."
                              className="secao-titulo-input"
                            />
                          </div>

                          <div className="secao-field optional">
                            <label>Resumo</label>
                            <textarea
                              value={getSecaoValue(secao.id, 'resumo') || ''}
                              onChange={(e) => handleUpdateSecao(secao.id, 'resumo', e.target.value)}
                              placeholder="Gerado por IA (sera implementado em breve)"
                              className="secao-resumo-input"
                              rows="2"
                            />
                          </div>

                          {/* Controles de expansão */}
                          <div className="secao-expand-controls">
                            <button
                              className="expand-toggle-button"
                              onClick={() => handleExpandSecao(secao.id)}
                            >
                              {expandedSecao === secao.id ? (
                                <>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 15l-6-6-6 6"></path>
                                  </svg>
                                  Recolher conteúdo
                                </>
                              ) : (
                                <>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"></path>
                                  </svg>
                                  Expandir conteúdo
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Controles de ação da seção */}
                        <div className="secao-actions">
                          <button
                            className="action-button delete"
                            onClick={() => handleDeleteSecaoModal(secao)}
                            title="Remover seção"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Conteúdo expandido da seção */}
                      {expandedSecao === secao.id && (
                        <div className="secao-content">
                          {renderSecaoContentAdmin(secao)}
                        </div>
                      )}
                    </div>
                  )
                ))}

                {/* Botão para adicionar nova seção - aparece quando há conteúdo (seções existentes ou uma nova criada) */}
                {(secoesFiltradas.length > 0 || novasSecoes.length > 0) && (
                  <div className="add-secao-container">
                    <button 
                      className="add-secao-button"
                      onClick={adicionarNovaSecao}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Adicionar conteúdo
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Modo visualização para usuários - voltando ao design original */
              <div className="capitulo-content-continuo">
                {secoesFiltradas.map((secao) => (
                  <div key={secao.id} className="secao-content-item">
                    {/* Renderizar conteúdo da seção com ordem correta */}
                    {renderSecaoContentUser(secao)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Controles de edição fixos na parte inferior */}
          {canManageSecoes && editMode && hasUnsavedChanges() && (
            <div className="edit-controls-bottom">
              <div className="edit-actions-inline">
                <button 
                  className="btn-outline btn-sm"
                  onClick={() => handleUnsavedChanges('DISCARD_ONLY')}
                  disabled={saving}
                >
                  Descartar
                </button>
                <button 
                  className="btn-primary btn-sm"
                  onClick={salvarSecoes}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}

          {/* Botão fixo para voltar ao topo - posição dinâmica */}
          <button 
            className={`back-to-top-button ${showBackToTop ? 'visible' : ''} ${
              canManageSecoes && editMode && hasUnsavedChanges() ? 'above-edit-controls' : ''
            }`}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            title="Voltar ao topo"
          >
            ↑
          </button>
        </>
      )}

      {/* Mensagem quando não há seções */}
      {!loading && !error && secoes.length === 0 && novasSecoes.length === 0 && (
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
              onClick={() => {
                setEditMode(true);
                adicionarNovaSecao();
              }}
              style={{ marginTop: '16px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Criar primeiro conteúdo
            </button>
          )}
        </div>
      )}

      {/* Mensagem quando não há resultados na pesquisa */}
      {!loading && !error && secoes.length > 0 && secoesFiltradas.length === 0 && searchTerm && (
        <div className="no-results">
          <p>Nenhum conteúdo encontrado para "{searchTerm}"</p>
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
        onClose={cancelarDescarte}
        onConfirm={confirmarDescarte}
        title="Descartar alterações?"
        message="Tem certeza que deseja descartar todas as alterações não salvas? Esta ação não pode ser desfeita."
        confirmText="Descartar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default Secoes;
