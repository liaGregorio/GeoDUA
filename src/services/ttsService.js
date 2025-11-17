// Configurações das APIs de TTS
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

/**
 * Providers de TTS disponíveis
 */
export const TTS_PROVIDERS = {
  ELEVENLABS_MULTILINGUAL_V2: {
    id: 'ELEVENLABS_MULTILINGUAL_V2',
    name: 'ElevenLabs Multilingual v2',
    model: 'eleven_multilingual_v2',
    description: 'Vozes ultra realistas com alta qualidade emocional (29 idiomas)',
    voices: [
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', language: 'pt-BR' },
      { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', language: 'pt-BR' },
      { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', gender: 'male', language: 'pt-BR' },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', language: 'pt-BR' },
      { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', gender: 'female', language: 'pt-BR' },
      { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'male', language: 'pt-BR' }
    ]
  },
  ELEVENLABS_FLASH_V2_5: {
    id: 'ELEVENLABS_FLASH_V2_5',
    name: 'ElevenLabs Flash v2.5',
    model: 'eleven_flash_v2_5',
    description: 'Ultra-rápido com baixa latência (~75ms) - Ideal para uso em tempo real (32 idiomas)',
    voices: [
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', language: 'pt-BR' },
      { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', language: 'pt-BR' },
      { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', gender: 'male', language: 'pt-BR' },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', language: 'pt-BR' },
      { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', gender: 'female', language: 'pt-BR' },
      { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'male', language: 'pt-BR' }
    ]
  },
  ELEVENLABS_TURBO_V2_5: {
    id: 'ELEVENLABS_TURBO_V2_5',
    name: 'ElevenLabs Turbo v2.5',
    model: 'eleven_turbo_v2_5',
    description: 'Equilíbrio entre qualidade e velocidade (~250-300ms) - 50% mais barato (32 idiomas)',
    voices: [
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', language: 'pt-BR' },
      { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', language: 'pt-BR' },
      { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', gender: 'male', language: 'pt-BR' },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', language: 'pt-BR' },
      { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', gender: 'female', language: 'pt-BR' },
      { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'male', language: 'pt-BR' }
    ]
  }
};

/**
 * Gera áudio usando ElevenLabs API
 * @param {string} texto - Texto para converter em áudio
 * @param {string} voiceId - ID da voz
 * @param {string} modelId - ID do modelo (eleven_multilingual_v2, eleven_flash_v2_5, etc)
 * @param {string} outputFormat - Formato de saída (mp3_44100_128, mp3_22050_32, etc)
 */
const gerarAudioElevenLabs = async (
  texto, 
  voiceId = 'EXAVITQu4vr4xnSDxMaL',
  modelId = 'eleven_multilingual_v2',
  outputFormat = 'mp3_44100_128'
) => {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('Chave API ElevenLabs não configurada');
  }

  try {
    // Adicionar output_format como query parameter
    const url = `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}?output_format=${outputFormat}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: texto,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Erro na API ElevenLabs: ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage += ` - ${errorData.detail?.message || errorData.message || 'Erro desconhecido'}`;
      } catch {
        errorMessage += ` - ${errorText || 'Erro desconhecido'}`;
      }
      
      throw new Error(errorMessage);
    }

    // Retornar o blob do áudio
    const audioBlob = await response.blob();
    return audioBlob;

  } catch (error) {
    console.error('Erro ao gerar áudio com ElevenLabs:', error);
    throw error;
  }
};

/**
 * Gera áudio usando o provider selecionado
 * @param {string} texto - O texto para converter em áudio
 * @param {string} provider - Provider de TTS (ex: 'ELEVENLABS_MULTILINGUAL_V2', 'ELEVENLABS_FLASH_V2_5', 'ELEVENLABS_TURBO_V2_5')
 * @param {string} voiceId - ID da voz a ser usada
 * @param {string} outputFormat - Formato de saída (padrão: mp3_44100_128)
 * @returns {Promise<Blob>} - O áudio gerado como Blob
 */
export const gerarAudio = async (
  texto, 
  provider = 'ELEVENLABS_FLASH_V2_5', 
  voiceId = null,
  outputFormat = 'mp3_44100_128'
) => {
  if (!texto || texto.trim().length === 0) {
    throw new Error('É necessário fornecer um texto para gerar o áudio');
  }

  // Validar se o provider está configurado
  if (!isProviderConfigured(provider)) {
    const instructions = getSetupInstructions(provider);
    throw new Error(
      `${TTS_PROVIDERS[provider].name} não configurado.\n\n` +
      `Para configurar:\n${instructions.instructions.map((step, i) => `${i + 1}. ${step}`).join('\n')}`
    );
  }

  // Validar se o provider existe
  if (!TTS_PROVIDERS[provider]) {
    throw new Error(`Provider não suportado: ${provider}`);
  }

  // Usar voz padrão se não especificada
  const defaultVoiceId = voiceId || TTS_PROVIDERS[provider].voices[0].id;
  const modelId = TTS_PROVIDERS[provider].model;

  // Todos os providers atuais usam ElevenLabs
  return await gerarAudioElevenLabs(texto, defaultVoiceId, modelId, outputFormat);
};

/**
 * Valida se um provider está configurado
 * @param {string} provider - 'ELEVENLABS_MULTILINGUAL_V2', 'ELEVENLABS_FLASH_V2_5' ou 'ELEVENLABS_TURBO_V2_5'
 * @returns {boolean}
 */
export const isProviderConfigured = (provider) => {
  // Todos os providers usam a mesma chave da ElevenLabs
  if (provider.startsWith('ELEVENLABS_')) {
    return !!ELEVENLABS_API_KEY && ELEVENLABS_API_KEY.length > 0;
  }
  return false;
};

/**
 * Retorna a lista de providers disponíveis
 * @returns {Array}
 */
export const getAvailableProviders = () => {
  return Object.values(TTS_PROVIDERS).map(provider => ({
    ...provider,
    configured: isProviderConfigured(provider.id)
  }));
};

/**
 * Retorna instruções de configuração para um provider
 * @param {string} provider - ID do provider
 * @returns {object}
 */
export const getSetupInstructions = (provider = 'ELEVENLABS_FLASH_V2_5') => {
  const isConfigured = isProviderConfigured(provider);
  
  return {
    configured: isConfigured,
    instructions: [
      'Acesse: https://elevenlabs.io/',
      'Crie uma conta gratuita (10.000 caracteres/mês)',
      'Faça login e acesse: https://elevenlabs.io/app/settings/api-keys',
      'Clique em "Create API Key"',
      'Copie a chave gerada',
      'Adicione no arquivo .env: VITE_ELEVENLABS_API_KEY=sua_chave_aqui',
      'Reinicie o servidor de desenvolvimento'
    ],
    benefits: [
      'Vozes ultra realistas com IA',
      '10.000 caracteres grátis por mês (Flash/Turbo)',
      'Suporte a 32 idiomas incluindo português brasileiro',
      'Qualidade de áudio excepcional',
      'Controle de emoção e estilo',
      'Flash v2.5: Ultra-baixa latência (~75ms)',
      'Turbo v2.5: Bom equilíbrio qualidade/velocidade (~250ms)',
      'Multilingual v2: Máxima qualidade emocional'
    ]
  };
};

/**
 * Converte um Blob de áudio para base64
 * @param {Blob} blob - Blob do áudio
 * @returns {Promise<string>} - String base64
 */
export const audioToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      // Retornar apenas o conteúdo base64 (sem o prefixo data:audio/...)
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Converte base64 para Blob de áudio
 * @param {string} base64 - String base64
 * @param {string} contentType - Tipo de conteúdo (ex: 'audio/mpeg')
 * @returns {Blob} - Blob do áudio
 */
export const base64ToAudioBlob = (base64, contentType = 'audio/mpeg') => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
};

/**
 * Cria uma URL temporária para reproduzir o áudio
 * @param {Blob} audioBlob - Blob do áudio
 * @returns {string} - URL temporária
 */
export const createAudioURL = (audioBlob) => {
  return URL.createObjectURL(audioBlob);
};

/**
 * Libera a URL temporária do áudio
 * @param {string} url - URL temporária
 */
export const revokeAudioURL = (url) => {
  URL.revokeObjectURL(url);
};
