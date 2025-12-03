import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigationHistory } from '../hooks/useNavigationHistory';
import { getSecoes, createSecao, updateSecao, deleteSecao, salvarSecoesComoRascunho } from '../services/secaoService';
import { getImagens, createImagem, deleteImagem, updateImagem, fileToBytea } from '../services/imagemService';
import { getCapitulos, getRascunhosByCapitulo, deleteCapitulo, getCapituloById } from '../services/capituloService';
import { getBookById } from '../services/bookService';
import { api } from '../services/api';
import { processImageData } from '../utils/imageUtils';
import { gerarResumo, isProviderConfigured, getSetupInstructions, gerarDescricaoImagem } from '../services/iaService';
import { gerarAudio, audioToBase64, base64ToAudioBlob, createAudioURL, revokeAudioURL, TTS_PROVIDERS } from '../services/ttsService';
import { getAudiosByCapitulo, createAudio, updateAudio, deleteAudio } from '../services/audioService';
import DeleteSecaoModal from '../components/DeleteSecaoModal';
import AddImagemModal from '../components/AddImagemModal';
import ConfirmDiscardModal from '../components/ConfirmDiscardModal';
import PublishConfirmModal from '../components/PublishConfirmModal';
import GerarResumoModal from '../components/GerarResumoModal';
import ResumoPreviewModal from '../components/ResumoPreviewModal';
import DescricaoPreviewModal from '../components/DescricaoPreviewModal';
import GerarAudioModal from '../components/GerarAudioModal';
import AudioPreviewModal from '../components/AudioPreviewModal';
import DeleteAudioModal from '../components/DeleteAudioModal';
import '../styles/secaoReorder.css';
import '../styles/audioPlayer.css';

const Secoes = () => {
  const { livroId, capituloId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { searchTerm, editMode, setEditMode } = useOutletContext();
  const { addToHistory } = useNavigationHistory(user?.id);
  
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
  const [isDragDisabled, setIsDragDisabled] = useState(false);

  // Estados dos modais (manter apenas para imagens)
  const [showDeleteSecaoModal, setShowDeleteSecaoModal] = useState(false);
  const [showAddImagemModal, setShowAddImagemModal] = useState(false);
  const [showConfirmDiscardModal, setShowConfirmDiscardModal] = useState(false);
  const [selectedSecao, setSelectedSecao] = useState(null);
  const [selectedSecaoForImage, setSelectedSecaoForImage] = useState(null);
  
  // Estado para controlar ações pendentes
  const [pendingAction, setPendingAction] = useState(null);

  // Estados para rascunhos
  const [rascunhos, setRascunhos] = useState([]);
  const [selectedRascunho, setSelectedRascunho] = useState(null);
  const [showRascunhos, setShowRascunhos] = useState(false);
  
  // Estados para modal de publicação
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [rascunhoParaPublicar, setRascunhoParaPublicar] = useState(null);
  const [publishingRascunho, setPublishingRascunho] = useState(false);

  // Estados para geração de resumo com IA
  const [showGerarResumoModal, setShowGerarResumoModal] = useState(false);
  const [secaoParaResumo, setSecaoParaResumo] = useState(null);
  const [showResumoPreview, setShowResumoPreview] = useState(false);
  const [resumoGerado, setResumoGerado] = useState('');
  const [providerUsado, setProviderUsado] = useState('GROQ');
  const [promptUsado, setPromptUsado] = useState(null);
  const [feedbackResumo, setFeedbackResumo] = useState(null);
  
  // Estados para geração de descrição de imagem com IA
  const [gerandoDescricao, setGerandoDescricao] = useState({});
  const [showDescricaoPreview, setShowDescricaoPreview] = useState(false);
  const [descricaoGerada, setDescricaoGerada] = useState('');
  const [imagemParaDescricao, setImagemParaDescricao] = useState(null);
  const [isRegeneratingDescricao, setIsRegeneratingDescricao] = useState(false);
  
  // Estado para controlar exibição de resumo vs conteúdo original
  const [secoesComResumo, setSecoesComResumo] = useState({});

  // Estados para geração e gerenciamento de áudio
  const [showGerarAudioModal, setShowGerarAudioModal] = useState(false);
  const [showAudioPreview, setShowAudioPreview] = useState(false);
  const [audioGerado, setAudioGerado] = useState(null);
  const [audioProviderUsado, setAudioProviderUsado] = useState('GOOGLE');
  const [audioVoiceUsado, setAudioVoiceUsado] = useState('');
  const [audioCapitulo, setAudioCapitulo] = useState(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isRegeneratingAudio, setIsRegeneratingAudio] = useState(false);
  const [showDeleteAudioModal, setShowDeleteAudioModal] = useState(false);

  // Verificar se o usuário pode gerenciar seções
  const canManageSecoes = user && user.tipoUsuario && user.tipoUsuario.id === 1;

  // Verificar se estamos editando um rascunho
  const isEditingDraft = capitulo && 
    capitulo.id_capitulo_original !== null && 
    capitulo.id_capitulo_original !== undefined &&
    capitulo.id_capitulo_original !== '';

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
      // Buscar capítulo diretamente pelo ID para garantir que temos os dados do Livro
      let capituloEncontrado = await getCapituloById(capituloId);
      
      // Se não tem dados do livro, buscar separadamente
      if (capituloEncontrado && !capituloEncontrado.Livro && livroId) {
        const livroData = await getBookById(livroId);
        capituloEncontrado.Livro = livroData;
      }
      
      setCapitulo(capituloEncontrado);
      
      // Adicionar ao histórico de navegação se encontrou o capítulo
      if (capituloEncontrado && capituloEncontrado.Livro) {
        addToHistory(
          livroId,
          capituloEncontrado.Livro.titulo,
          capituloEncontrado.id,
          capituloEncontrado.titulo || capituloEncontrado.nome
        );
      }
      
    } catch (err) {
      console.error('Erro ao buscar capítulo:', err);
      
      // Fallback: tentar buscar da lista de capítulos
      try {
        const capitulos = await getCapitulos(livroId);
        let capituloEncontrado = capitulos.find(cap => cap.id === parseInt(capituloId));
        
        // Se não encontrou, pode ser um rascunho - buscar entre todos os rascunhos
        if (!capituloEncontrado && user?.id) {
          try {
            for (const cap of capitulos) {
              const rascunhosDoCapitulo = await getRascunhosByCapitulo(cap.id, user.id);
              if (Array.isArray(rascunhosDoCapitulo)) {
                capituloEncontrado = rascunhosDoCapitulo.find(rascunho => rascunho.id === parseInt(capituloId));
                if (capituloEncontrado) {
                  break;
                }
              }
            }
          } catch (rascunhoError) {
            // Erro ao buscar rascunhos não é crítico
          }
        }
        
        // Se encontrou mas não tem dados do livro, buscar separadamente
        if (capituloEncontrado && !capituloEncontrado.Livro && livroId) {
          const livroData = await getBookById(livroId);
          capituloEncontrado.Livro = livroData;
        }
        
        setCapitulo(capituloEncontrado);
      } catch (fallbackErr) {
        console.error('Erro no fallback ao buscar capítulo:', fallbackErr);
      }
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
    fetchSecoes();
  }, [livroId, capituloId]);

  // Buscar capítulo quando user estiver disponível
  useEffect(() => {
    if (user?.id) {
      fetchCapitulo();
    }
  }, [livroId, capituloId, user?.id]);

  // Buscar áudio do capítulo
  useEffect(() => {
    if (capitulo && capitulo.id) {
      fetchAudioCapitulo();
    }
  }, [capitulo?.id]);

  // Buscar rascunhos quando user e capitulo estiverem disponíveis
  useEffect(() => {
    if (user?.id && capitulo) {
      fetchRascunhos();
    }
  }, [user?.id, capitulo?.id, capitulo?.id_capitulo_original]);

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

  const handleUpdateSecao = (secaoId, field, value, promptDireto = null, feedbackDireto = null) => {
    // Encontrar a seção existente
    const secaoExistenteIndex = secoesEditadas.findIndex(s => s.id === secaoId);
    
    if (secaoExistenteIndex >= 0) {
      // Atualizar seção já em edição
      setSecoesEditadas(prev => prev.map(secao => {
        if (secao.id === secaoId) {
          const updated = { ...secao, [field]: value };
          
          // Se estiver atualizando o resumo e temos feedback/prompt da IA, adicionar
          if (field === 'resumo' && (feedbackDireto !== null || feedbackResumo !== null)) {
            updated.prompt = promptDireto || promptUsado;
            updated.feedback = feedbackDireto !== null ? feedbackDireto : feedbackResumo;
            console.log('Adicionando prompt e feedback à seção existente:', { 
              prompt: updated.prompt, 
              feedback: updated.feedback,
              feedbackDireto,
              feedbackResumo 
            });
          }
          
          return updated;
        }
        return secao;
      }));
    } else {
      // Buscar a seção original para preservar todos os campos existentes
      const secaoOriginal = secoes.find(s => s.id === secaoId);
      
      const updatedSecao = {
        id: secaoId,
        titulo: secaoOriginal?.titulo || '',
        resumo: secaoOriginal?.resumo || '',
        original: secaoOriginal?.original || '',
        link3d: secaoOriginal?.link3d || '',
        ordem3d: secaoOriginal?.ordem3d || 1,
        ordem: secaoOriginal?.ordem || 0,
        prompt: secaoOriginal?.prompt || null,
        feedback: secaoOriginal?.feedback || null,
        [field]: value // Sobrescreve o campo sendo editado
      };
      
      // Se estiver atualizando o resumo e temos feedback/prompt da IA, adicionar
      if (field === 'resumo' && (feedbackDireto !== null || feedbackResumo !== null)) {
        updatedSecao.prompt = promptDireto || promptUsado;
        updatedSecao.feedback = feedbackDireto !== null ? feedbackDireto : feedbackResumo;
        console.log('Adicionando prompt e feedback à nova entrada:', { 
          prompt: updatedSecao.prompt, 
          feedback: updatedSecao.feedback,
          feedbackDireto,
          feedbackResumo 
        });
      }
      
      // Adicionar nova seção à lista de editadas preservando os campos originais
      setSecoesEditadas(prev => [...prev, updatedSecao]);
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
    const mostrarResumo = secoesComResumo[secao.id];
    const temResumo = secao.resumo && secao.resumo.trim() !== '';
    const temConteudo = secao.original && secao.original.trim() !== '';

    // Sempre adicionar título e conteúdo original primeiro (se existirem)
    if (secao.titulo && secao.titulo.trim() !== '') {
      items.push({
        type: 'titulo',
        content: secao.titulo,
        ordem: 0 // Título sempre primeiro
      });
    }

    // Adicionar botão de alternância se houver resumo e conteúdo
    if (temResumo && temConteudo) {
      items.push({
        type: 'toggle-resumo',
        secaoId: secao.id,
        mostrarResumo: mostrarResumo,
        ordem: 0.5 // Entre título e conteúdo
      });
    }

    // Adicionar conteúdo (original ou resumo) se existir
    if (mostrarResumo && temResumo) {
      items.push({
        type: 'resumo',
        content: secao.resumo,
        ordem: 1 // Conteúdo sempre após título
      });
    } else if (temConteudo) {
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
            {item.type === 'toggle-resumo' && (
              <div className="resumo-toggle-container">
                <button 
                  className="btn-toggle-resumo"
                  onClick={() => toggleResumo(item.secaoId)}
                  title={item.mostrarResumo ? 'Ver conteúdo completo' : 'Ver resumo'}
                >
                  {item.mostrarResumo ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      Ver conteúdo completo
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                      Ver resumo
                    </>
                  )}
                </button>
              </div>
            )}
            {item.type === 'resumo' && (
              <div className="secao-resumo-display">
                <div className="resumo-badge">Resumo</div>
                {item.content.split('\n').map((paragraph, pIndex) => (
                  paragraph.trim() !== '' && <p key={pIndex}>{paragraph}</p>
                ))}
              </div>
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
          <h4>Modelo Tátil (opcional):</h4>
          <div className="link3d-container">
            <input
              type="url"
              value={getSecaoValue(secao.id, 'link3d') || ''}
              onChange={(e) => handleUpdateSecao(secao.id, 'link3d', e.target.value)}
              className="secao-link3d-input"
              placeholder="https://exemplo.com/modelo-tatil"
            />
            {getSecaoValue(secao.id, 'link3d') && (
              <div className="link3d-order">
                <label>Posição do Modelo Tátil:</label>
                <select
                  value={getSecaoValue(secao.id, 'ordem3d') || 1}
                  onChange={(e) => handleUpdateSecao(secao.id, 'ordem3d', parseInt(e.target.value))}
                  className="order-select"
                >
                  <option value={1}>Após o conteúdo</option>
                  <option value={99}>No final (após todas as imagens)</option>
                </select>
                <small>Define onde o Modelo Tátil aparecerá no conteúdo</small>
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
                    <div className="image-description-container">
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
                      <button
                        type="button"
                        className="btn-generate-description-ai"
                        onClick={() => gerarDescricaoImagemComIA(imagem.id, imagem.file)}
                        disabled={gerandoDescricao[`img-${imagem.id}`]}
                        title="Gerar descrição com IA"
                      >
                        {gerandoDescricao[`img-${imagem.id}`] ? (
                          <>
                            <svg className="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"></circle>
                            </svg>
                            Gerando...
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                            </svg>
                            IA
                          </>
                        )}
                      </button>
                    </div>
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

  // Função para gerar descrição de imagem com IA
  const gerarDescricaoImagemComIA = async (imagemId, imageFile, imageUrl = null) => {
    const key = `img-${imagemId}`;
    
    try {
      setGerandoDescricao(prev => ({ ...prev, [key]: true }));
      
      let fileToAnalyze = imageFile;
      
      // Se não temos o arquivo mas temos a URL (imagem já salva), buscar a imagem
      if (!fileToAnalyze && imageUrl) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          fileToAnalyze = new File([blob], 'image.jpg', { type: blob.type });
        } catch (fetchError) {
          console.error('Erro ao buscar imagem:', fetchError);
          throw new Error('Não foi possível carregar a imagem para análise');
        }
      }
      
      if (!fileToAnalyze) {
        throw new Error('Imagem não disponível para análise');
      }
      
      const descricao = await gerarDescricaoImagem(fileToAnalyze);
      
      // Armazenar a descrição gerada e abrir o modal para revisão
      setDescricaoGerada(descricao);
      setImagemParaDescricao({ imagemId, imageFile, imageUrl });
      setShowDescricaoPreview(true);
      
    } catch (error) {
      console.error('Erro ao gerar descrição:', error);
      showNotification('error', error.message || 'Erro ao gerar descrição da imagem');
    } finally {
      setGerandoDescricao(prev => ({ ...prev, [key]: false }));
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
            <button
              type="button"
              className="btn-generate-description-ai"
              onClick={() => gerarDescricaoImagemComIA(imagem.id, null, processedImage.src)}
              disabled={gerandoDescricao[`img-${imagem.id}`]}
              title="Gerar descrição com IA"
            >
              {gerandoDescricao[`img-${imagem.id}`] ? (
                <>
                  <svg className="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                  Gerando...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                  </svg>
                  IA
                </>
              )}
            </button>
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
                <div className="image-description-container">
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
                  <button
                    type="button"
                    className="btn-generate-description-ai"
                    onClick={() => gerarDescricaoImagemComIA(imagem.id, imagem.file)}
                    disabled={gerandoDescricao[`img-${imagem.id}`]}
                    title="Gerar descrição com IA"
                  >
                    {gerandoDescricao[`img-${imagem.id}`] ? (
                      <>
                        <svg className="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                        Gerando...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                        </svg>
                        IA
                      </>
                    )}
                  </button>
                </div>
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
  const atualizarNovaSecao = (secaoId, campo, valor, promptDireto = null, feedbackDireto = null) => {
    setNovasSecoes(prev => prev.map(secao => {
      if (secao.id === secaoId) {
        const updated = { ...secao, [campo]: valor };
        
        // Se estiver atualizando o resumo e temos feedback/prompt da IA, adicionar
        if (campo === 'resumo' && (feedbackDireto !== null || feedbackResumo !== null)) {
          updated.prompt = promptDireto || promptUsado;
          updated.feedback = feedbackDireto !== null ? feedbackDireto : feedbackResumo;
          console.log('Adicionando prompt e feedback à nova seção:', { 
            prompt: updated.prompt, 
            feedback: updated.feedback,
            feedbackDireto,
            feedbackResumo 
          });
        }
        
        return updated;
      }
      return secao;
    }));
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
  const handleMouseOverDraggable = (e) => {
    // Verificar se o mouse está sobre um elemento que não deve permitir drag
    const target = e.target;
    const isDragForbidden = target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' || 
                           target.tagName === 'SELECT' ||
                           target.tagName === 'BUTTON' ||
                           target.isContentEditable ||
                           target.closest('input, textarea, select, button, .image-description-input, .secao-content-input, .secao-link3d-input');
    
    setIsDragDisabled(isDragForbidden);
  };

  const handleMouseLeaveDraggable = (e) => {
    // Reabilitar drag quando sair da área
    setIsDragDisabled(false);
  };

  const handleDragStartNovaSecao = (e, novaSecao, index) => {
    // Prevenir drag quando estiver interagindo com inputs, textareas, etc.
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.tagName === 'SELECT' ||
        e.target.tagName === 'BUTTON' ||
        e.target.isContentEditable ||
        e.target.closest('input, textarea, select, button')) {
      e.preventDefault();
      return;
    }

    const todasSecoes = getTodasSecoesOrdenadas();
    const realIndex = todasSecoes.findIndex(s => s.id === novaSecao.id && s.isNew);
    setDraggedSecao({ secao: novaSecao, index: realIndex, isNew: true });
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');
  };

  const handleDragStart = (e, secao, index) => {
    // Prevenir drag quando estiver interagindo com inputs, textareas, etc.
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.tagName === 'SELECT' ||
        e.target.tagName === 'BUTTON' ||
        e.target.isContentEditable ||
        e.target.closest('input, textarea, select, button')) {
      e.preventDefault();
      return;
    }

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
          const promptMudou = secaoOriginal.prompt !== secaoEditada.prompt;
          const feedbackMudou = secaoOriginal.feedback !== secaoEditada.feedback;
          
          // Comparação mais rigorosa da ordem
          const ordemOriginal = Number(secaoOriginal.ordem);
          const ordemEditada = Number(secaoEditada.ordem);
          const ordemMudou = ordemOriginal !== ordemEditada;
          
          const temMudancas = tituloMudou || resumoMudou || originalMudou || link3dMudou || ordem3dMudou || ordemMudou || promptMudou || feedbackMudou;
          
          if (temMudancas) {
            try {
              console.log('Salvando seção com dados:', secaoEditada);
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
        
        console.log('Criando nova seção com dados:', secaoData);
        
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

  // Buscar rascunhos do capítulo
  const fetchRascunhos = async () => {
    if (!user || !canManageSecoes) return;
    
    try {
      // Se estamos editando um rascunho, buscar rascunhos do capítulo original
      const targetCapituloId = isEditingDraft && capitulo?.id_capitulo_original 
        ? capitulo.id_capitulo_original 
        : capituloId;
        
      const rascunhosData = await getRascunhosByCapitulo(targetCapituloId, user.id);
      setRascunhos(Array.isArray(rascunhosData) ? rascunhosData : []);
    } catch (error) {
      console.error('Erro ao buscar rascunhos:', error);
      setRascunhos([]);
    }
  };

  const salvarComoRascunho = async () => {
    if (!canManageSecoes || !user) {
      showNotification('error', 'Você não tem permissão para salvar rascunhos');
      return;
    }

    if (isEditingDraft) {
      showNotification('warning', 'Você já está editando um rascunho. Use "Salvar" ou "Publicar Rascunho"');
      return;
    }

    if (!hasUnsavedChanges()) {
      showNotification('warning', 'Não há alterações para salvar como rascunho');
      return;
    }

    try {
      setSaving(true);
      
      // Preparar dados das seções para salvar
      const secoesParaSalvar = [];
      
      // Seções editadas
      secoesEditadas.forEach(secaoEditada => {
        const secaoOriginal = secoes.find(s => s.id === secaoEditada.id);
        if (secaoOriginal) {
          secoesParaSalvar.push({
            ...secaoOriginal,
            ...secaoEditada,
            imagens: secaoImages[secaoEditada.id] || [],
            imagensEditadas: imagensEditadas[secaoEditada.id] || [],
            imagensMarcadasParaRemocao: imagensMarcadasParaRemocao[secaoEditada.id] || []
          });
        }
      });
      
      // Novas seções
      novasSecoes.forEach(novaSecao => {
        secoesParaSalvar.push({
          ...novaSecao,
          imagens: imagensTemporarias[novaSecao.id] || []
        });
      });

      // Salvar como rascunho
      const resultado = await salvarSecoesComoRascunho(capituloId, secoesParaSalvar, user.id);
      
      showNotification('success', 'Rascunho salvo com sucesso!');
      
      // Limpar estados de edição
      setSecoesEditadas([]);
      setNovasSecoes([]);
      setImagensTemporarias({});
      setImagensEditadas({});
      setImagensMarcadasParaRemocao({});
      
      // Atualizar lista de rascunhos
      await fetchRascunhos();
      
      // Sair do modo de edição
      exitEditModeAfterSave();
      
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      showNotification('error', error.message || 'Erro ao salvar rascunho');
    } finally {
      setSaving(false);
    }
  };

  // Funções para gerenciar rascunhos
  const carregarRascunho = async (rascunhoId) => {
    if (!canManageSecoes) return;
    
    try {
      setLoading(true);
      // Navegar para o rascunho
      navigate(`/livro/${livroId}/capitulo/${rascunhoId}/secoes`);
    } catch (error) {
      console.error('Erro ao carregar rascunho:', error);
      showNotification('error', 'Erro ao carregar rascunho');
    } finally {
      setLoading(false);
    }
  };

  const publicarRascunho = (rascunhoId, nomeRascunho) => {
    if (!canManageSecoes) return;
    
    // Preparar dados para o modal
    const isCurrentDraft = rascunhoId === capituloId;
    setRascunhoParaPublicar({
      id: rascunhoId,
      nome: nomeRascunho,
      isCurrentDraft,
      actualRascunhoId: isCurrentDraft ? capituloId : rascunhoId,
      actualDestinationId: isCurrentDraft ? capitulo?.id_capitulo_original : capituloId
    });
    setShowPublishModal(true);
  };
  
  const confirmarPublicacao = async () => {
    if (!rascunhoParaPublicar) return;
    
    try {
      setPublishingRascunho(true);
      
      // Fazer a requisição para publicar o rascunho
      const response = await api.post(`/capitulos/${rascunhoParaPublicar.actualRascunhoId}/publicar`, {
        id_capitulo_destino: rascunhoParaPublicar.actualDestinationId
      });
      
      showNotification('success', 'Rascunho publicado com sucesso! Redirecionando para o capítulo principal...');
      
      // Se estávamos editando o rascunho, navegar para o capítulo principal
      if (rascunhoParaPublicar.isCurrentDraft) {
        setTimeout(() => {
          navigate(`/livro/${livroId}/capitulo/${rascunhoParaPublicar.actualDestinationId}/secoes`);
        }, 1500);
      } else {
        // Recarregar dados
        await fetchSecoes();
        await fetchRascunhos();
        
        // Sair do modo de edição se estiver ativo
        if (editMode) {
          setEditMode(false);
        }
      }
      
      // Fechar modal
      setShowPublishModal(false);
      setRascunhoParaPublicar(null);
      
    } catch (error) {
      console.error('Erro ao publicar rascunho:', error);
      showNotification('error', error.response?.data?.message || 'Erro ao publicar rascunho');
    } finally {
      setPublishingRascunho(false);
    }
  };

  const excluirRascunho = async (rascunhoId, nomeRascunho) => {
    if (!canManageSecoes || !window.confirm(`Tem certeza que deseja excluir o rascunho "${nomeRascunho}"?`)) {
      return;
    }
    
    try {
      await deleteCapitulo(rascunhoId);
      showNotification('success', 'Rascunho excluído com sucesso');
      await fetchRascunhos();
    } catch (error) {
      console.error('Erro ao excluir rascunho:', error);
      showNotification('error', 'Erro ao excluir rascunho');
    }
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

  // Função para alternar entre resumo e conteúdo original
  const toggleResumo = (secaoId) => {
    setSecoesComResumo(prev => ({
      ...prev,
      [secaoId]: !prev[secaoId]
    }));
  };

  // Buscar áudio do capítulo
  const fetchAudioCapitulo = async () => {
    try {
      setLoadingAudio(true);
      const response = await getAudiosByCapitulo(capitulo.id);
      
      if (response.success && response.data && response.data.length > 0) {
        // Pegar o primeiro áudio (assumindo que há apenas um por capítulo)
        const audioData = response.data[0];
        
        // Converter Buffer para base64 string se necessário
        if (audioData.conteudo && audioData.conteudo.type === 'Buffer' && Array.isArray(audioData.conteudo.data)) {
          // Método mais eficiente e correto para converter Buffer para base64
          const uint8Array = new Uint8Array(audioData.conteudo.data);
          
          // Usar um método otimizado para grandes arrays
          const chunkSize = 0x8000; // 32KB chunks
          let base64String = '';
          
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, i + chunkSize);
            base64String += String.fromCharCode.apply(null, chunk);
          }
          
          base64String = btoa(base64String);
          
          audioData.conteudo = base64String;
        }
        
        setAudioCapitulo(audioData);
      } else {
        setAudioCapitulo(null);
      }
    } catch (error) {
      console.error('Erro ao buscar áudio:', error);
      setAudioCapitulo(null);
    } finally {
      setLoadingAudio(false);
    }
  };

  // Função para obter o texto completo de todas as seções para gerar áudio
  const obterTextoCompletoDasSecoes = () => {
    return secoesFiltradas
      .map(secao => {
        let texto = '';
        if (secao.titulo && secao.titulo.trim() !== '') {
          texto += `${secao.titulo}.\n\n`;
        }
        if (secao.original && secao.original.trim() !== '') {
          texto += `${secao.original}\n\n`;
        }
        return texto;
      })
      .join('\n')
      .trim();
  };

  // Função para abrir o modal de geração de áudio
  const handleOpenGerarAudio = () => {
    setShowGerarAudioModal(true);
  };

  // Função para gerar áudio
  const handleGerarAudio = async (textoCompleto, provider, voiceId) => {
    try {
      const audioBlob = await gerarAudio(textoCompleto, provider, voiceId);
      
      setAudioGerado(audioBlob);
      setAudioProviderUsado(provider);
      setAudioVoiceUsado(voiceId);
      
      // Mostrar preview
      setShowAudioPreview(true);
    } catch (error) {
      console.error('Erro ao gerar áudio:', error);
      throw error;
    }
  };

  // Função para aceitar e salvar o áudio
  const handleAcceptAudio = async () => {
    if (!audioGerado) {
      showNotification('error', 'Nenhum áudio para salvar');
      return;
    }

    try {
      setLoadingAudio(true);

      // Converter blob para base64
      const base64Audio = await audioToBase64(audioGerado);

      // Verificar se já existe um áudio para este capítulo
      if (audioCapitulo && audioCapitulo.id) {
        // Atualizar áudio existente
        const response = await updateAudio(audioCapitulo.id, {
          conteudo: base64Audio,
          content_type: 'audio/mpeg',
          id_capitulo: capitulo.id
        });

        if (response.success) {
          setAudioCapitulo(response.data);
          showNotification('success', 'Áudio atualizado com sucesso!');
        }
      } else {
        // Criar novo áudio
        const response = await createAudio({
          conteudo: base64Audio,
          content_type: 'audio/mpeg',
          id_capitulo: capitulo.id
        });

        if (response.success) {
          setAudioCapitulo(response.data);
          showNotification('success', 'Áudio salvo com sucesso!');
        }
      }

      setAudioGerado(null);
      setShowAudioPreview(false);
    } catch (error) {
      console.error('Erro ao salvar áudio:', error);
      showNotification('error', 'Erro ao salvar áudio');
    } finally {
      setLoadingAudio(false);
    }
  };

  // Função para regerar áudio
  const handleRegenerateAudio = () => {
    setIsRegeneratingAudio(true);
    setShowAudioPreview(false);
    setShowGerarAudioModal(true);
    setAudioGerado(null);
    setIsRegeneratingAudio(false);
  };

  // Função para abrir modal de confirmação de exclusão
  const handleOpenDeleteAudio = () => {
    setShowDeleteAudioModal(true);
  };

  // Função para deletar áudio
  const handleDeleteAudio = async () => {
    if (!audioCapitulo) return;

    try {
      setLoadingAudio(true);
      const response = await deleteAudio(audioCapitulo.id);

      if (response.success) {
        setAudioCapitulo(null);
        showNotification('success', 'Áudio excluído com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao deletar áudio:', error);
      showNotification('error', 'Erro ao excluir áudio');
    } finally {
      setLoadingAudio(false);
    }
  };

  // Funções para gerar resumo com IA
  const handleOpenGerarResumo = (secao) => {
    setSecaoParaResumo(secao);
    setShowGerarResumoModal(true);
    setFeedbackResumo(null);
  };

  const handleGerarResumo = async (textoOriginal, provider, promptPersonalizado = null) => {
    if (!isProviderConfigured(provider)) {
      const instructions = getSetupInstructions(provider);
      alert(
        `🔑 ${provider} não configurado!\n\n` +
        'Para usar a geração de resumos com IA, siga estes passos:\n\n' +
        instructions.instructions.map((step, i) => `${i + 1}. ${step}`).join('\n') +
        '\n\n✨ Benefícios:\n' +
        instructions.benefits.map(b => `• ${b}`).join('\n')
      );
      return;
    }

    try {
      showNotification('info', `Gerando resumo com ${provider}...`);
      
      // Adicionar sempre a instrução final ao prompt
      const promptFinal = promptPersonalizado 
        ? `${promptPersonalizado}\n\nRetorne apenas o resumo, sem introduções ou explicações adicionais.`
        : null;
      
      const resumo = await gerarResumo(textoOriginal, provider, promptFinal);
      
      // Armazenar o resumo gerado e informações para o preview
      setResumoGerado(resumo);
      setProviderUsado(provider);
      setPromptUsado(promptFinal);
      
      // Fechar modal de configuração e abrir modal de preview
      setShowGerarResumoModal(false);
      setShowResumoPreview(true);
      
      showNotification('success', 'Resumo gerado! Revise antes de aceitar.');
      
    } catch (error) {
      console.error('Erro ao gerar resumo:', error);
      showNotification('error', `Erro ao gerar resumo: ${error.message}`);
    }
  };

  const handleAcceptResumo = (userFeedback) => {
    console.log('handleAcceptResumo chamado com:', { userFeedback, promptUsado, resumoGerado: resumoGerado?.substring(0, 50) });
    
    // Salvar o feedback do usuário (true = gostou, false = não gostou, null = não respondeu)
    setFeedbackResumo(userFeedback);
    
    // Atualizar o resumo da seção (existente ou nova) PASSANDO OS VALORES DIRETAMENTE
    if (secaoParaResumo.isNew) {
      atualizarNovaSecao(secaoParaResumo.id, 'resumo', resumoGerado, promptUsado, userFeedback);
    } else {
      handleUpdateSecao(secaoParaResumo.id, 'resumo', resumoGerado, promptUsado, userFeedback);
    }
    
    showNotification('success', 'Resumo adicionado com sucesso!');
    
    // Fechar modais e limpar estados
    setShowResumoPreview(false);
    setSecaoParaResumo(null);
    setResumoGerado('');
    setProviderUsado('GROQ');
    setPromptUsado(null);
  };

  const handleRegenerateResumo = () => {
    // Usuário não gostou do resumo (feedback negativo)
    setFeedbackResumo(false);
    
    // Voltar para o modal de configuração
    setShowResumoPreview(false);
    setShowGerarResumoModal(true);
  };

  // Funções para gerenciar preview de descrição de imagem
  const handleAcceptDescricao = () => {
    if (!imagemParaDescricao) return;

    const { imagemId } = imagemParaDescricao;

    // Verificar se é imagem temporária
    if (imagemId.toString().startsWith('temp-')) {
      // Atualizar descrição de imagem temporária
      setImagensTemporarias(prev => {
        const updated = {};
        Object.keys(prev).forEach(secaoKey => {
          updated[secaoKey] = prev[secaoKey].map(img => 
            img.id === imagemId ? { ...img, descricao: descricaoGerada } : img
          );
        });
        return updated;
      });
    } else {
      // Atualizar descrição de imagem existente
      atualizarDescricaoImagem(imagemId, descricaoGerada);
    }

    showNotification('success', 'Descrição aplicada com sucesso!');
    setShowDescricaoPreview(false);
    setDescricaoGerada('');
    setImagemParaDescricao(null);
  };

  const handleRegenerateDescricao = async () => {
    if (!imagemParaDescricao) return;

    const { imagemId, imageFile, imageUrl } = imagemParaDescricao;
    setIsRegeneratingDescricao(true);

    try {
      let fileToAnalyze = imageFile;
      
      // Se não temos o arquivo mas temos a URL, buscar a imagem
      if (!fileToAnalyze && imageUrl) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        fileToAnalyze = new File([blob], 'image.jpg', { type: blob.type });
      }
      
      if (!fileToAnalyze) {
        throw new Error('Imagem não disponível para análise');
      }
      
      const novaDescricao = await gerarDescricaoImagem(fileToAnalyze);
      setDescricaoGerada(novaDescricao);
      
    } catch (error) {
      console.error('Erro ao regenerar descrição:', error);
      showNotification('error', 'Erro ao gerar nova descrição');
    } finally {
      setIsRegeneratingDescricao(false);
    }
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
              {capitulo && (
                <div className="capitulo-title-container">
                  <h1>{capitulo.nome}</h1>
                  {isEditingDraft && (
                    <span className="draft-indicator">Rascunho</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Seção de rascunhos - apenas para admins, quando há rascunhos, e não estamos editando um rascunho */}
      {canManageSecoes && rascunhos.length > 0 && !isEditingDraft && (
        <div className="rascunhos-section">
          <div className="rascunhos-header">
            <h3>Seus Rascunhos</h3>
            <button 
              className="toggle-rascunhos-button"
              onClick={() => setShowRascunhos(!showRascunhos)}
            >
              {showRascunhos ? 'Ocultar' : 'Mostrar'} ({rascunhos.length})
              <span className={`toggle-icon ${showRascunhos ? 'rotated' : ''}`}>
                ▼
              </span>
            </button>
          </div>
          
          {showRascunhos && (
            <div className="rascunhos-list">
              {rascunhos.map(rascunho => (
                <div key={rascunho.id} className="rascunho-card">
                  <div className="rascunho-content">
                    <div className="rascunho-info">
                      <h4>{rascunho.nome}</h4>
                    </div>
                    <div className="rascunho-actions">
                      <button 
                        className="rascunho-action-btn edit-btn"
                        onClick={() => carregarRascunho(rascunho.id)}
                        title="Editar rascunho"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Editar
                      </button>
                      <button 
                        className="rascunho-action-btn publish-btn"
                        onClick={() => publicarRascunho(rascunho.id, rascunho.nome)}
                        title="Substituir capítulo principal por este rascunho"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                        </svg>
                        Publicar
                      </button>
                      <button 
                        className="rascunho-action-btn delete-btn"
                        onClick={() => excluirRascunho(rascunho.id, rascunho.nome)}
                        title="Excluir rascunho"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6"></polyline>
                          <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Player de Áudio do Capítulo */}
      {!loading && !error && secoes.length > 0 && (
        <div className="audio-player-section">
          {audioCapitulo ? (
            <div className="audio-player-card">
              <div className="audio-player-header">
                <div className="audio-player-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  </svg>
                  <span>Áudio do Capítulo</span>
                </div>
                {canManageSecoes && editMode && (
                  <div className="audio-player-actions">
                    <button 
                      className="btn-regenerate-audio"
                      onClick={handleOpenGerarAudio}
                      title="Gerar novo áudio"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23,4 23,10 17,10"></polyline>
                        <polyline points="1,20 1,14 7,14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                      </svg>
                    </button>
                    <button 
                      className="btn-delete-audio"
                      onClick={handleOpenDeleteAudio}
                      title="Excluir áudio"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="audio-player-content">
                <audio 
                  controls 
                  src={`data:${audioCapitulo.content_type};base64,${audioCapitulo.conteudo}`}
                  className="audio-element"
                  onError={(e) => {
                    console.error('Audio element error:', {
                      error: e.target.error,
                      errorCode: e.target.error?.code,
                      errorMessage: e.target.error?.message,
                      src: e.target.src?.substring(0, 100) + '...'
                    });
                  }}
                  onLoadedMetadata={(e) => {
                    console.log('Audio metadata loaded:', {
                      duration: e.target.duration,
                      readyState: e.target.readyState
                    });
                  }}
                >
                  Seu navegador não suporta o elemento de áudio.
                </audio>
              </div>
            </div>
          ) : (
            canManageSecoes && editMode && (
              <div className="no-audio-card">
                <div className="no-audio-content">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"></polygon>
                    <line x1="23" y1="9" x2="17" y2="15"></line>
                    <line x1="17" y1="9" x2="23" y2="15"></line>
                  </svg>
                  <p>Este capítulo ainda não possui áudio</p>
                  <button 
                    className="btn-primary btn-generate-audio"
                    onClick={handleOpenGerarAudio}
                    disabled={loadingAudio}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                    </svg>
                    Gerar Áudio com IA
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

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
                      draggable={!reordenandoSecoes && !isDragDisabled}
                      onMouseOver={handleMouseOverDraggable}
                      onMouseLeave={handleMouseLeaveDraggable}
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
                            <div className="resumo-header-container">
                              <label>Resumo</label>
                              <button
                                type="button"
                                className="btn-generate-ai"
                                onClick={() => handleOpenGerarResumo({ ...secao, isNew: true })}
                                disabled={!secao.original || secao.original.trim().length === 0}
                                title={!secao.original || secao.original.trim().length === 0 ? 'Adicione um conteúdo primeiro' : 'Gerar resumo com IA'}
                              >
                                Gerar com IA
                              </button>
                            </div>
                            <textarea
                              value={secao.resumo || ''}
                              onChange={(e) => atualizarNovaSecao(secao.id, 'resumo', e.target.value)}
                              placeholder="Digite um resumo ou gere automaticamente com IA"
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
                          <label>Modelo Tátil</label>
                          <input
                            type="url"
                            value={secao.link3d || ''}
                            onChange={(e) => atualizarNovaSecao(secao.id, 'link3d', e.target.value)}
                            className="secao-link3d-input"
                            placeholder="https://exemplo.com/modelo-tatil"
                          />
                          {secao.link3d && (
                            <div className="link3d-order">
                              <label>Posição do Modelo Tátil:</label>
                              <select
                                value={secao.ordem3d || 1}
                                onChange={(e) => atualizarNovaSecao(secao.id, 'ordem3d', parseInt(e.target.value))}
                                className="order-select"
                              >
                                <option value={1}>Após o conteúdo</option>
                                <option value={99}>No final (após todas as imagens)</option>
                              </select>
                              <small>Define onde o Modelo Tátil aparecerá no conteúdo</small>
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
                      draggable={!reordenandoSecoes && !isDragDisabled}
                      onMouseOver={handleMouseOverDraggable}
                      onMouseLeave={handleMouseLeaveDraggable}
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
                            <div className="resumo-header-container">
                              <label>Resumo</label>
                              <button
                                type="button"
                                className="btn-generate-ai"
                                onClick={() => handleOpenGerarResumo({ ...secao, isNew: false })}
                                disabled={!getSecaoValue(secao.id, 'original') || getSecaoValue(secao.id, 'original').trim().length === 0}
                                title={!getSecaoValue(secao.id, 'original') || getSecaoValue(secao.id, 'original').trim().length === 0 ? 'Adicione um conteúdo primeiro' : 'Gerar resumo com IA'}
                              >
                                Gerar com IA
                              </button>
                            </div>
                            <textarea
                              value={getSecaoValue(secao.id, 'resumo') || ''}
                              onChange={(e) => handleUpdateSecao(secao.id, 'resumo', e.target.value)}
                              placeholder="Digite um resumo ou gere automaticamente com IA"
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
          {canManageSecoes && (
            (editMode && (isEditingDraft || hasUnsavedChanges())) || 
            (isEditingDraft && !editMode)
          ) && (
            <div className="edit-controls-bottom">
              <div className="edit-actions-inline">
                {editMode && hasUnsavedChanges() && (
                  <button 
                    className="btn-outline btn-sm"
                    onClick={() => handleUnsavedChanges('DISCARD_ONLY')}
                    disabled={saving}
                  >
                    Descartar
                  </button>
                )}
                {isEditingDraft ? (
                  // Se estamos editando um rascunho, mostrar opções de salvar e publicar (sempre visíveis)
                  <>
                    <button 
                      className="btn-secondary btn-sm"
                      onClick={editMode ? salvarSecoes : () => setEditMode(true)}
                      disabled={saving}
                      title={editMode ? "Salvar alterações no rascunho" : "Ativar modo de edição"}
                    >
                      {saving ? 'Salvando...' : (editMode ? 'Salvar' : 'Editar')}
                    </button>
                    <button 
                      className="btn-primary btn-sm"
                      onClick={() => publicarRascunho(capituloId, capitulo?.nome)}
                      disabled={saving}
                      title="Publicar este rascunho como capítulo principal"
                    >
                      {saving ? 'Publicando...' : 'Publicar Rascunho'}
                    </button>
                  </>
                ) : (
                  // Se estamos editando o capítulo principal, mostrar opções normais (só quando há mudanças)
                  hasUnsavedChanges() && (
                    <>
                      <button 
                        className="btn-secondary btn-sm"
                        onClick={salvarComoRascunho}
                        disabled={saving}
                        title="Salvar alterações como rascunho"
                      >
                        {saving ? 'Salvando...' : 'Salvar como Rascunho'}
                      </button>
                      <button 
                        className="btn-primary btn-sm"
                        onClick={salvarSecoes}
                        disabled={saving}
                      >
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                    </>
                  )
                )}
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

      {/* Modal de confirmação para publicar rascunho */}
      <PublishConfirmModal 
        isOpen={showPublishModal}
        onClose={() => {
          setShowPublishModal(false);
          setRascunhoParaPublicar(null);
        }}
        onConfirm={confirmarPublicacao}
        rascunhoNome={rascunhoParaPublicar?.nome || ''}
        loading={publishingRascunho}
      />

      {/* Modal de geração de resumo com IA */}
      <GerarResumoModal
        isOpen={showGerarResumoModal}
        onClose={() => {
          setShowGerarResumoModal(false);
          setSecaoParaResumo(null);
        }}
        onGenerate={handleGerarResumo}
        textoOriginal={secaoParaResumo?.isNew 
          ? secaoParaResumo?.original 
          : getSecaoValue(secaoParaResumo?.id, 'original')
        }
      />

      {/* Modal de preview do resumo gerado */}
      <ResumoPreviewModal
        isOpen={showResumoPreview}
        onClose={() => {
          setShowResumoPreview(false);
          setResumoGerado('');
        }}
        resumoGerado={resumoGerado}
        provider={providerUsado}
        onAccept={handleAcceptResumo}
        onRegenerate={handleRegenerateResumo}
        isRegenerating={false}
      />

      {/* Modal de preview de descrição de imagem */}
      <DescricaoPreviewModal
        isOpen={showDescricaoPreview}
        onClose={() => {
          setShowDescricaoPreview(false);
          setDescricaoGerada('');
          setImagemParaDescricao(null);
        }}
        descricaoGerada={descricaoGerada}
        onAccept={handleAcceptDescricao}
        onRegenerate={handleRegenerateDescricao}
        isRegenerating={isRegeneratingDescricao}
      />

      {/* Modal de geração de áudio */}
      <GerarAudioModal
        isOpen={showGerarAudioModal}
        onClose={() => {
          setShowGerarAudioModal(false);
        }}
        onGenerate={handleGerarAudio}
        textoOriginal={obterTextoCompletoDasSecoes()}
      />

      {/* Modal de preview do áudio */}
      <AudioPreviewModal
        isOpen={showAudioPreview}
        onClose={() => {
          setShowAudioPreview(false);
          setAudioGerado(null);
        }}
        audioBlob={audioGerado}
        provider={TTS_PROVIDERS[audioProviderUsado]?.name || audioProviderUsado}
        voiceName={TTS_PROVIDERS[audioProviderUsado]?.voices.find(v => v.id === audioVoiceUsado)?.name || ''}
        onAccept={handleAcceptAudio}
        onRegenerate={handleRegenerateAudio}
        isRegenerating={isRegeneratingAudio}
      />

      {/* Modal de confirmação de exclusão de áudio */}
      <DeleteAudioModal
        isOpen={showDeleteAudioModal}
        onClose={() => setShowDeleteAudioModal(false)}
        onDelete={handleDeleteAudio}
        loading={loadingAudio}
      />
    </div>
  );
};

export default Secoes;
