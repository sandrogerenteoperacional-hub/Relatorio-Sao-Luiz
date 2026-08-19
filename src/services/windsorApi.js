// src/services/windsorApi.js

const WINDSOR_BASE_URL = 'https://connectors.windsor.ai/all';

// Função para mapear métricas planas do Windsor de volta para o formato de array 'actions' esperado pelo dashboard
const mapWindsorToMetaFormat = (row) => {
  const actions = [];
  const costs = [];
  
  const purchases = row.purchases || row.actions_purchase || row.actions_offsite_conversion_fb_pixel_purchase || 0;
  if (purchases) {
    actions.push({ action_type: 'purchase', value: purchases.toString() });
  }
  
  const leads = row.leads || row.actions_lead || 0;
  if (leads) {
    actions.push({ action_type: 'lead', value: leads.toString() });
  }
  // No windsor, podemos usar uma das colunas para representar msgs.
  if (row.onsite_conversion_messaging_conversation_started_7d || row.messaging_conversations_started || row.actions_onsite_conversion_messaging_conversation_started_7d) {
    const msgs = row.onsite_conversion_messaging_conversation_started_7d || row.messaging_conversations_started || row.actions_onsite_conversion_messaging_conversation_started_7d;
    actions.push({ action_type: 'messaging_conversation_started', value: msgs.toString() });
  }
  if (row.landing_page_views || row.actions_landing_page_view) {
    const views = row.landing_page_views || row.actions_landing_page_view;
    actions.push({ action_type: 'landing_page_view', value: views.toString() });
  }
  if (row.outbound_clicks || row.link_clicks || row.inline_link_clicks || row.actions_link_click) {
    const lclicks = row.outbound_clicks || row.link_clicks || row.inline_link_clicks || row.actions_link_click;
    actions.push({ action_type: 'link_click', value: lclicks.toString() });
  }

  // Preenche costs baseado nas divisões do spend, caso não venha roas/cpa já feitos
  // Para manter a compatibilidade com getActionCost
  if (purchases && row.spend) costs.push({ action_type: 'purchase', value: (row.spend / purchases).toString() });
  if (leads && row.spend) costs.push({ action_type: 'lead', value: (row.spend / leads).toString() });
  
  return {
    campaign_name: row.campaign,
    objective: row.objective || '',
    spend: row.spend || 0,
    impressions: row.impressions || 0,
    clicks: row.clicks || 0,
    reach: row.reach || 0,
    frequency: row.impressions > 0 && row.reach > 0 ? row.impressions / row.reach : 1,
    cpc: row.clicks > 0 ? (row.spend / row.clicks) : 0,
    cpm: row.impressions > 0 ? (row.spend / row.impressions) * 1000 : 0,
    ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0,
    actions,
    cost_per_action_type: costs,
    // Daily format
    date_start: row.date || undefined
  };
};

export const fetchWindsorData = async (accountId, apiKey, since, until, fields = 'campaign,spend,clicks,impressions,reach,objective,roas,purchases,leads,outbound_clicks,landing_page_views,inline_link_clicks,onsite_conversion_messaging_conversation_started_7d,actions_purchase,actions_offsite_conversion_fb_pixel_purchase,actions_lead,actions_link_click') => {
  const params = new URLSearchParams({
    api_key: apiKey,
    date_from: since,
    date_to: until,
    fields: 'account_id,' + fields
  });

  const url = `${WINDSOR_BASE_URL}?${params.toString()}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erro ao conectar com Windsor.ai');
    
    const data = await response.json();
    if (!data.data) return [];
    
    // Filtrar apenas o accountId desejado (o Windsor pode retornar todas as contas cadastradas lá)
    const filteredRows = data.data.filter(row => String(row.account_id) === String(accountId));
    
    // Mapeia de volta para o formato Meta
    return filteredRows.map(mapWindsorToMetaFormat);
  } catch (error) {
    console.error("Erro no Windsor:", error);
    throw error;
  }
};
