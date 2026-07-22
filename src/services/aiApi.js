export const generateAiReport = async (apiKey, prompt) => {
  if (!apiKey) {
    throw new Error('A Chave de API do Gemini não está configurada na aba de Integrações.');
  }

  try {
    // 1. Fetch available models to avoid "not found" errors
    const modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const modelsResponse = await fetch(modelsUrl);
    if (!modelsResponse.ok) {
      throw new Error('Falha ao listar os modelos da API. Verifique sua chave.');
    }
    
    const modelsData = await modelsResponse.json();
    const availableModels = modelsData.models || [];
    
    // Filter models that support generateContent
    const validModels = availableModels.filter(m => 
      m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
    );

    if (validModels.length === 0) {
      throw new Error('Nenhum modelo de geração de texto disponível para esta chave de API.');
    }

    // Try to find a 'flash' or 'pro' model, otherwise pick the first one
    let selectedModel = validModels.find(m => m.name.includes('flash'));
    if (!selectedModel) {
      selectedModel = validModels.find(m => m.name.includes('pro'));
    }
    if (!selectedModel) {
      selectedModel = validModels[0];
    }

    const modelName = selectedModel.name; // e.g. "models/gemini-1.5-flash"

    // 2. Generate Content using the dynamically selected model
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Erro ao comunicar com a IA.');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Erro na geração de IA:', error);
    throw error;
  }
};
