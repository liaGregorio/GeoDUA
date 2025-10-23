const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// Modelo atualizado: Llama 3.3 70B Versatile
const MODEL = 'llama-3.3-70b-versatile';

/**
 * Prompt padrão para geração de resumos
 */
const DEFAULT_PROMPT = `Você é um assistente especializado em criar resumos educacionais claros e concisos.
Analise o texto fornecido e crie um resumo objetivo que:
- Capture os pontos principais
- Use linguagem clara e acessível
- Tenha entre 2-4 frases
- Seja direto e informativo
- Mantenha o tom educacional

Retorne apenas o resumo, sem introduções ou explicações adicionais.`;

/**
 * Gera um resumo usando a API Groq
 * @param {string} texto - O texto original para resumir
 * @param {string} promptPersonalizado - Prompt personalizado (opcional)
 * @returns {Promise<string>} - O resumo gerado
 */
export const gerarResumo = async (texto, promptPersonalizado = null) => {
  if (!GROQ_API_KEY) {
    throw new Error(
      'Chave API Groq não configurada. Adicione VITE_GROQ_API_KEY no arquivo .env\n\n' +
      'Como obter (GRÁTIS):\n' +
      '1. Acesse: https://console.groq.com/\n' +
      '2. Faça login\n' +
      '3. Vá em "API Keys"\n' +
      '4. Clique em "Create API Key"\n' +
      '5. Copie e adicione no .env'
    );
  }

  if (!texto || texto.trim().length === 0) {
    throw new Error('É necessário fornecer um texto para gerar o resumo');
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: promptPersonalizado || DEFAULT_PROMPT
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

    const resumo = data.choices[0].message.content.trim();
    return resumo;

  } catch (error) {
    console.error('Erro ao gerar resumo:', error);
    throw error;
  }
};

/**
 * Valida se a chave API está configurada
 * @returns {boolean}
 */
export const isGroqConfigured = () => {
  return !!GROQ_API_KEY && GROQ_API_KEY.length > 0;
};

/**
 * Retorna informações sobre como configurar a API
 * @returns {object}
 */
export const getSetupInstructions = () => {
  return {
    configured: isGroqConfigured(),
    instructions: {
      step1: 'Acesse: https://console.groq.com/',
      step2: 'Faça login com Google ou GitHub',
      step3: 'Clique em "API Keys" no menu lateral',
      step4: 'Clique em "Create API Key"',
      step5: 'Copie a chave gerada',
      step6: 'Adicione no arquivo .env: VITE_GROQ_API_KEY=sua_chave_aqui',
      step7: 'Reinicie o servidor de desenvolvimento'
    },
    benefits: [
      'Totalmente gratuito',
      '30 requisições por minuto',
      '6.000 tokens por minuto',
      'Modelo Llama 3.1 70B de alta qualidade',
      'Ótimo para resumos em português'
    ]
  };
};
