// Configurações das APIs
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Providers de IA disponíveis
 */
export const AI_PROVIDERS = {
  GROQ: {
    id: 'GROQ',
    name: 'Groq (Llama 3.3)',
    description: 'Ultra rápido'
  },
  GEMINI: {
    id: 'GEMINI',
    name: 'Google Gemini 2.0 Flash',
    description: 'Alta qualidade'
  }
};

/**
 * Prompt padrão para geração de resumos
 */
const DEFAULT_PROMPT = `Você é um assistente especializado em criar resumos educacionais claros e concisos.
Analise o texto fornecido e crie um resumo objetivo que:
- Capture os pontos principais
- Use linguagem clara e acessível
- Seja direto e informativo
- Mantenha o tom educacional

Retorne apenas o resumo, sem introduções ou explicações adicionais.`;

/**
 * Gera um resumo usando Groq API
 */
const gerarResumoGroq = async (texto, promptPersonalizado = null) => {
  if (!GROQ_API_KEY) {
    throw new Error('Chave API Groq não configurada');
  }

  const prompt = promptPersonalizado || DEFAULT_PROMPT;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: `Texto para resumir:\n\n${texto}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Erro na API Groq: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`
      );
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Resposta inválida da API Groq');
    }

    return data.choices[0].message.content.trim();

  } catch (error) {
    console.error('Erro ao gerar resumo com Groq:', error);
    throw error;
  }
};

/**
 * Gera um resumo usando Google Gemini API
 */
const gerarResumoGemini = async (texto, promptPersonalizado = null) => {
  if (!GEMINI_API_KEY) {
    throw new Error('Chave API Google Gemini não configurada');
  }

  const prompt = promptPersonalizado || DEFAULT_PROMPT;
  const fullPrompt = `${prompt}\n\nTexto para resumir:\n\n${texto}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
          topP: 0.95,
          topK: 40
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Erro na API Gemini: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`
      );
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Resposta inválida da API Gemini');
    }

    return data.candidates[0].content.parts[0].text.trim();

  } catch (error) {
    console.error('Erro ao gerar resumo com Gemini:', error);
    throw error;
  }
};

/**
 * Gera um resumo usando o provider selecionado
 * @param {string} texto - O texto original para resumir
 * @param {string} provider - Provider de IA ('GROQ' ou 'GEMINI')
 * @param {string} promptPersonalizado - Prompt personalizado (opcional)
 * @returns {Promise<string>} - O resumo gerado
 */
export const gerarResumo = async (texto, provider = 'GROQ', promptPersonalizado = null) => {
  if (!texto || texto.trim().length === 0) {
    throw new Error('É necessário fornecer um texto para gerar o resumo');
  }

  // Validar se o provider está configurado
  if (!isProviderConfigured(provider)) {
    const instructions = getSetupInstructions(provider);
    throw new Error(
      `${AI_PROVIDERS[provider].name} não configurado.\n\n` +
      `Para configurar:\n${instructions.instructions.map((step, i) => `${i + 1}. ${step}`).join('\n')}`
    );
  }

  switch (provider) {
    case 'GROQ':
      return await gerarResumoGroq(texto, promptPersonalizado);
    
    case 'GEMINI':
      return await gerarResumoGemini(texto, promptPersonalizado);
    
    default:
      throw new Error(`Provider não suportado: ${provider}`);
  }
};

/**
 * Valida se um provider está configurado
 * @param {string} provider - 'GROQ' ou 'GEMINI'
 * @returns {boolean}
 */
export const isProviderConfigured = (provider) => {
  switch (provider) {
    case 'GROQ':
      return !!GROQ_API_KEY && GROQ_API_KEY.length > 0;
    case 'GEMINI':
      return !!GEMINI_API_KEY && GEMINI_API_KEY.length > 0;
    default:
      return false;
  }
};

/**
 * Retorna a lista de providers disponíveis
 * @returns {Array}
 */
export const getAvailableProviders = () => {
  return Object.values(AI_PROVIDERS).map(provider => ({
    ...provider,
    configured: isProviderConfigured(provider.id)
  }));
};

/**
 * Retorna instruções de configuração para um provider
 * @param {string} provider - 'GROQ' ou 'GEMINI'
 * @returns {object}
 */
export const getSetupInstructions = (provider = 'GROQ') => {
  const instructions = {
    GROQ: {
      configured: isProviderConfigured('GROQ'),
      instructions: [
        'Acesse: https://console.groq.com/',
        'Faça login com Google ou GitHub',
        'Clique em "API Keys" no menu lateral',
        'Clique em "Create API Key"',
        'Copie a chave gerada',
        'Adicione no arquivo .env: VITE_GROQ_API_KEY=sua_chave_aqui',
        'Reinicie o servidor de desenvolvimento'
      ],
      benefits: [
        'Totalmente gratuito',
        '30 requisições por minuto',
        'Ultra rápido (hardware Groq LPU)',
        'Modelo Llama 3.3 70B de alta qualidade',
        'Ótimo para resumos em português'
      ]
    },
    GEMINI: {
      configured: isProviderConfigured('GEMINI'),
      instructions: [
        'Acesse: https://aistudio.google.com/app/apikey',
        'Faça login com sua conta Google',
        'Clique em "Create API Key"',
        'Selecione ou crie um projeto do Google Cloud',
        'Copie a chave gerada',
        'Adicione no arquivo .env: VITE_GEMINI_API_KEY=sua_chave_aqui',
        'Reinicie o servidor de desenvolvimento'
      ],
      benefits: [
        'Totalmente gratuito',
        '60 requisições por minuto',
        'Alta qualidade para português',
        'Modelo Gemini 2.0 Flash',
        'Integração com Google'
      ]
    }
  };

  return instructions[provider] || instructions.GROQ;
};

/**
 * Retorna o prompt padrão
 * @returns {string}
 */
export const getDefaultPrompt = () => DEFAULT_PROMPT;

// Manter compatibilidade com código antigo
export const isGroqConfigured = () => isProviderConfigured('GROQ');
