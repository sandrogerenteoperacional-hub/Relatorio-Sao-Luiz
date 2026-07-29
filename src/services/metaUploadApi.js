export const fetchAdSetsForCampaigns = async (accountId, token) => {
  const url = `https://graph.facebook.com/v19.0/act_${accountId}/adsets`;
  const params = new URLSearchParams({
    access_token: token,
    fields: 'id,name,campaign{id,name},status',
    limit: 500
  });

  const response = await fetch(`${url}?${params.toString()}`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Erro ao buscar conjuntos de anúncios.');
  }
  const data = await response.json();
  return data.data || [];
};

export const uploadAdImage = async (accountId, token, file) => {
  const url = `https://graph.facebook.com/v19.0/act_${accountId}/adimages`;
  const formData = new FormData();
  formData.append('access_token', token);
  formData.append('filename', file);

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Erro ao fazer upload da imagem.');
  }

  const data = await response.json();
  const firstImageKey = Object.keys(data.images)[0];
  return data.images[firstImageKey].hash;
};

export const createAdCreative = async (accountId, token, { name, pageId, imageHash, title, body, link, ctaType = 'LEARN_MORE', cards }) => {
  const url = `https://graph.facebook.com/v19.0/act_${accountId}/adcreatives`;
  
  let objectStorySpec;

  if (cards && cards.length > 1) {
    // Modo Carrossel
    objectStorySpec = {
      page_id: pageId,
      link_data: {
        link: link, // Link principal do carrossel (fallback)
        message: body, // Texto principal do anúncio
        child_attachments: cards.map(c => ({
          link: c.link || link,
          image_hash: c.imageHash,
          name: c.title,
          description: c.body,
          call_to_action: {
            type: ctaType,
            value: { link: c.link || link }
          }
        }))
      }
    };
  } else {
    // Modo Imagem Única
    const singleHash = cards ? cards[0].imageHash : imageHash;
    const singleTitle = cards ? cards[0].title : title;
    // se for single via cards, o body individual vai no description, mas no single o body é o message (main text)
    // Para simplificar, mantemos o body (message principal) e usamos o title no nome.
    
    objectStorySpec = {
      page_id: pageId,
      link_data: {
        image_hash: singleHash,
        link: link,
        message: body,
        name: singleTitle,
        call_to_action: {
          type: ctaType,
          value: { link: link }
        }
      }
    };
  }

  const params = new URLSearchParams({
    access_token: token,
    name: name,
    object_story_spec: JSON.stringify(objectStorySpec)
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Erro ao criar o criativo do anúncio.');
  }

  const data = await response.json();
  return data.id;
};

export const createAd = async (accountId, token, { name, adsetId, creativeId, status = 'PAUSED' }) => {
  const url = `https://graph.facebook.com/v19.0/act_${accountId}/ads`;
  
  const params = new URLSearchParams({
    access_token: token,
    name: name,
    adset_id: adsetId,
    creative: JSON.stringify({ creative_id: creativeId }),
    status: status
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Erro ao criar o anúncio.');
  }

  const data = await response.json();
  return data.id;
};
