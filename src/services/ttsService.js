// Configurações das APIs de TTS
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

const GOOGLE_TTS_API_KEY = import.meta.env.VITE_GOOGLE_TTS_API_KEY;
const GOOGLE_TTS_API_URL = 'https://texttospeech.googleapis.com/v1';

/**
 * Providers de TTS disponíveis
 */
export const TTS_PROVIDERS = {
  ELEVENLABS: {
    id: 'ELEVENLABS',
    name: 'ElevenLabs',
    description: 'Vozes ultra realistas',
    voices: [
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', language: 'pt-BR' },
      { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', language: 'pt-BR' },
      { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', gender: 'male', language: 'pt-BR' },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', language: 'pt-BR' }
    ]
  },
  GOOGLE: {
    id: 'GOOGLE',
    name: 'Google Cloud TTS',
    description: 'Vozes naturais do Google',
    voices: [
      { id: 'pt-BR-Standard-A', name: 'Feminina (A)', gender: 'female', language: 'pt-BR' },
      { id: 'pt-BR-Standard-B', name: 'Masculina (B)', gender: 'male', language: 'pt-BR' },
      { id: 'pt-BR-Wavenet-A', name: 'Feminina WaveNet (A)', gender: 'female', language: 'pt-BR' },
      { id: 'pt-BR-Wavenet-B', name: 'Masculina WaveNet (B)', gender: 'male', language: 'pt-BR' },
      { id: 'pt-BR-Neural2-A', name: 'Feminina Neural (A)', gender: 'female', language: 'pt-BR' },
      { id: 'pt-BR-Neural2-B', name: 'Masculina Neural (B)', gender: 'male', language: 'pt-BR' }
    ]
  }
};

/**
 * Gera áudio usando ElevenLabs API
 */
const gerarAudioElevenLabs = async (texto, voiceId = 'EXAVITQu4vr4xnSDxMaL') => {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('Chave API ElevenLabs não configurada');
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: texto,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Erro na API ElevenLabs: ${response.status} - ${errorData.detail?.message || 'Erro desconhecido'}`
      );
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
 * Gera áudio usando Google Cloud TTS API
 */
const gerarAudioGoogle = async (texto, voiceId = 'pt-BR-Neural2-A') => {
  if (!GOOGLE_TTS_API_KEY) {
    throw new Error('Chave API Google Cloud TTS não configurada');
  }

  try {
    const response = await fetch(`${GOOGLE_TTS_API_URL}/text:synthesize?key=${GOOGLE_TTS_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: texto },
        voice: {
          languageCode: 'pt-BR',
          name: voiceId
        },
        audioConfig: {
          audioEncoding: 'MP3',
          pitch: 0,
          speakingRate: 1.0
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Erro na API Google TTS: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`
      );
    }

    const data = await response.json();
    
    if (!data.audioContent) {
      throw new Error('Resposta inválida da API Google TTS');
    }

    // Converter base64 para blob
    const audioData = atob(data.audioContent);
    const audioArray = new Uint8Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      audioArray[i] = audioData.charCodeAt(i);
    }
    const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
    
    return audioBlob;

  } catch (error) {
    console.error('Erro ao gerar áudio com Google TTS:', error);
    throw error;
  }
};

/**
 * Gera áudio usando o provider selecionado
 * @param {string} texto - O texto para converter em áudio
 * @param {string} provider - Provider de TTS ('ELEVENLABS' ou 'GOOGLE')
 * @param {string} voiceId - ID da voz a ser usada
 * @returns {Promise<Blob>} - O áudio gerado como Blob
 */
export const gerarAudio = async (texto, provider = 'GOOGLE', voiceId = null) => {
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

  // Usar voz padrão se não especificada
  const defaultVoiceId = voiceId || TTS_PROVIDERS[provider].voices[0].id;

  switch (provider) {
    case 'ELEVENLABS':
      return await gerarAudioElevenLabs(texto, defaultVoiceId);
    
    case 'GOOGLE':
      return await gerarAudioGoogle(texto, defaultVoiceId);
    
    default:
      throw new Error(`Provider não suportado: ${provider}`);
  }
};

/**
 * Valida se um provider está configurado
 * @param {string} provider - 'ELEVENLABS' ou 'GOOGLE'
 * @returns {boolean}
 */
export const isProviderConfigured = (provider) => {
  switch (provider) {
    case 'ELEVENLABS':
      return !!ELEVENLABS_API_KEY && ELEVENLABS_API_KEY.length > 0;
    case 'GOOGLE':
      return !!GOOGLE_TTS_API_KEY && GOOGLE_TTS_API_KEY.length > 0;
    default:
      return false;
  }
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
 * @param {string} provider - 'ELEVENLABS' ou 'GOOGLE'
 * @returns {object}
 */
export const getSetupInstructions = (provider = 'GOOGLE') => {
  const instructions = {
    ELEVENLABS: {
      configured: isProviderConfigured('ELEVENLABS'),
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
        '10.000 caracteres grátis por mês',
        'Vozes em português brasileiro',
        'Qualidade de áudio excepcional',
        'Controle de emoção e estilo'
      ]
    },
    GOOGLE: {
      configured: isProviderConfigured('GOOGLE'),
      instructions: [
        'Acesse: https://console.cloud.google.com/',
        'Crie ou selecione um projeto',
        'Ative a API Cloud Text-to-Speech',
        'Vá em "APIs e Serviços" > "Credenciais"',
        'Clique em "Criar credenciais" > "Chave de API"',
        'Copie a chave gerada',
        'Adicione no arquivo .env: VITE_GOOGLE_TTS_API_KEY=sua_chave_aqui',
        'Reinicie o servidor de desenvolvimento'
      ],
      benefits: [
        'US$ 4 milhões de caracteres grátis/mês',
        'Vozes WaveNet e Neural de alta qualidade',
        'Vozes em português brasileiro',
        'Integração com Google Cloud',
        'Altamente escalável'
      ]
    }
  };

  return instructions[provider] || instructions.GOOGLE;
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
