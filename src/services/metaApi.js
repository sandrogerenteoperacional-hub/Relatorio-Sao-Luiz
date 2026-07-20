export const fetchMetaAdsData = async (accountId, token, since, until) => {
  const url = `https://graph.facebook.com/v19.0/act_${accountId}/insights`;
  const params = new URLSearchParams({
    access_token: token,
    level: 'campaign',
    fields: 'campaign_name,objective,spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,cost_per_action_type,date_start,date_stop',
    time_range: JSON.stringify({ since, until }),
    limit: 500
  });

  const response = await fetch(`${url}?${params.toString()}`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Erro ao comunicar com a API do Meta');
  }

  const data = await response.json();
  return data.data || [];
};

export const fetchCampaignsStatus = async (accountId, token) => {
  const url = `https://graph.facebook.com/v19.0/act_${accountId}/campaigns`;
  const params = new URLSearchParams({
    access_token: token,
    fields: 'name,status,objective',
    limit: 500
  });

  const response = await fetch(`${url}?${params.toString()}`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
};

// Extrator flexível de ações específicas (busca por substring para evitar problemas com prefixos/sufixos do Meta)
const getActionCount = (actions, actionTypes) => {
  if (!actions || !Array.isArray(actions)) return 0;
  let count = 0;
  for (const a of actions) {
    if (actionTypes.some(type => a.action_type.includes(type))) {
      count += parseFloat(a.value || 0);
    }
  }
  return count;
};

// Extrator do custo gerado pela própria Meta API
const getActionCost = (costs, actionTypes) => {
  if (!costs || !Array.isArray(costs)) return 0;
  for (const a of costs) {
    if (actionTypes.some(type => a.action_type.includes(type))) {
      return parseFloat(a.value || 0);
    }
  }
  return 0;
};

// Classifica a campanha num Grupo de Objetivo Macro
const getObjectiveGroup = (objective, name) => {
  const objLower = (objective || '').toLowerCase();
  const nameLower = (name || '').toLowerCase();
  
  if (objLower.includes('messages') || objLower.includes('lead') || nameLower.includes('lead') || nameLower.includes('mensagem')) {
    return 'Conversas & Leads';
  }
  if (objLower.includes('conversions') || objLower.includes('sales') || nameLower.includes('venda')) {
    return 'Vendas';
  }
  if (objLower.includes('traffic') || objLower.includes('link_clicks')) {
    return 'Tráfego';
  }
  if (objLower.includes('reach') || objLower.includes('brand_awareness') || objLower.includes('awareness')) {
    return 'Reconhecimento';
  }
  if (objLower.includes('engagement') || nameLower.includes('engajamento')) {
    return 'Engajamento';
  }
  return 'Outros';
};

// Retorna os dados do Funil, Resultado e CPA extraídos da API
const extractFunnelAndResults = (group, row, clicks, impressions, reach, spend) => {
  const actions = row.actions || [];
  const costs = row.cost_per_action_type || [];
  
  const linkClicks = getActionCount(actions, ['link_click']);
  const landingViews = getActionCount(actions, ['landing_page_view']);
  
  let result = 0;
  let resultName = 'Resultados';
  let cpa = 0;
  let isCpmBased = false;
  let funnelLandingViews = landingViews;
  let funnelLinkClicks = linkClicks > 0 ? linkClicks : clicks;
  if (funnelLandingViews > funnelLinkClicks) {
    funnelLinkClicks = clicks > funnelLandingViews ? clicks : funnelLandingViews;
  }
  
  if (group === 'Conversas & Leads') {
    const leads = getActionCount(actions, ['lead']);
    const msgs = getActionCount(actions, ['messaging_conversation_started']);
    
    // Auto-detect if this is actually a traffic campaign disguised as leads (e.g. App meu queridinho)
    if (landingViews > leads + msgs && landingViews > 10) {
      result = landingViews;
      cpa = getActionCost(costs, ['landing_page_view']);
      resultName = 'Visitas (LP)';
    } else {
      const types = ['lead', 'messaging_conversation_started'];
      result = leads + msgs;
      cpa = getActionCost(costs, types);
      resultName = 'Leads/Conversas';
      funnelLandingViews = 0; // Hide landing views for whatsapp/leads to keep funnel clean
    }
  } else if (group === 'Vendas') {
    const types = ['purchase'];
    result = getActionCount(actions, types);
    cpa = getActionCost(costs, types);
    resultName = 'Compras';
  } else if (group === 'Tráfego') {
    const nameLower = (row.campaign_name || '').toLowerCase();
    const isProfile = nameLower.includes('ig') || nameLower.includes('perfil') || nameLower.includes('instagram');
    
    if (isProfile) {
      let igVisits = getActionCount(actions, ['profile_visit', 'profile_view']);
      let igCost = getActionCost(costs, ['profile_visit', 'profile_view']);
      
      if (igVisits > 0) {
        result = igVisits;
        cpa = igCost > 0 ? igCost : (spend / igVisits);
      } else {
        result = funnelLinkClicks;
        cpa = getActionCost(costs, ['link_click']);
      }
      resultName = 'Visitas ao Perfil';
      funnelLandingViews = 0; // Profile visits don't have landing pages
    } else {
      if (landingViews > 0) {
        result = landingViews;
        cpa = getActionCost(costs, ['landing_page_view']);
        resultName = 'Visitas (LP)';
      } else {
        result = funnelLinkClicks;
        cpa = getActionCost(costs, ['link_click']);
        resultName = 'Cliques no Link';
      }
    }
  } else if (group === 'Engajamento') {
    // Sem fallback para post_engagement: Engajamento = Conversas Iniciadas
    const types = ['messaging_conversation_started'];
    result = getActionCount(actions, types);
    cpa = getActionCost(costs, types);
    resultName = 'Conversas Iniciadas';
  } else if (group === 'Reconhecimento') {
    result = reach;
    cpa = reach > 0 ? (spend / reach) * 1000 : 0;
    resultName = 'Pessoas Alcançadas';
    isCpmBased = true;
  } else {
    result = clicks;
    cpa = getActionCost(costs, ['link_click']);
    resultName = 'Cliques';
  }

  if (cpa === 0 && result > 0 && !isCpmBased) {
    cpa = spend / result;
  }

  return {
    result,
    resultName,
    cpa,
    isCpmBased,
    rawActions: JSON.stringify(actions.map(a => `${a.action_type}:${a.value}`)),
    funnel: {
      impressions,
      linkClicks: funnelLinkClicks,
      landingViews: funnelLandingViews,
      conversions: result
    }
  };
};

export const processApiData = (insightsData, campaignsData) => {
  const statusMap = {};
  if (campaignsData) {
    campaignsData.forEach(c => { statusMap[c.name] = c.status; });
  }

  const report = {
    summary: {
      invested: 0,
      activeCampaignsCount: 0,
      totalReach: 0,
      totalImpressions: 0,
      totalClicks: 0,
      health: 'BOM' // BOM, ATENCAO, CRITICO
    },
    objectives: {}, 
    campaigns: [], // Array de todas as campanhas processadas
  };

  insightsData.forEach(row => {
    const name = row.campaign_name;
    if (!name || name.startsWith('Resultados de')) return;

    const spend = parseFloat(row.spend || 0);
    const impressions = parseFloat(row.impressions || 0);
    const clicks = parseFloat(row.clicks || 0);
    const reach = parseFloat(row.reach || 0);
    const frequency = parseFloat(row.frequency || 0);
    const cpc = parseFloat(row.cpc || 0);
    const cpm = parseFloat(row.cpm || 0);
    
    const status = statusMap[name] || 'ACTIVE';
    const isActive = status === 'ACTIVE';

    if (isActive) report.summary.activeCampaignsCount++;
    report.summary.invested += spend;
    report.summary.totalImpressions += impressions;
    report.summary.totalClicks += clicks;
    report.summary.totalReach += reach;

    const group = getObjectiveGroup(row.objective, name);
    const { result, resultName, cpa, isCpmBased, funnel, rawActions } = extractFunnelAndResults(group, row, clicks, impressions, reach, spend);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    const campData = {
      name,
      group,
      status,
      isActive,
      spend,
      impressions,
      clicks,
      reach,
      frequency,
      cpc,
      cpm,
      ctr,
      result,
      resultName,
      cpa,
      rawActions,
      funnel
    };

    report.campaigns.push(campData);

    // Group aggregation
    if (!report.objectives[group]) {
      report.objectives[group] = {
        name: group,
        campaignCount: 0,
        spend: 0,
        result: 0,
        resultName,
        isCpmBased,
        impressions: 0,
        clicks: 0,
        reach: 0,
        frequencySum: 0,
        frequencyCount: 0,
        funnel: { impressions: 0, linkClicks: 0, landingViews: 0, conversions: 0 }
      };
    }

    const obj = report.objectives[group];
    obj.campaignCount++;
    obj.spend += spend;
    obj.result += result;
    obj.impressions += impressions;
    obj.clicks += clicks;
    obj.reach += reach;
    
    if (frequency > 0) {
      obj.frequencySum += frequency;
      obj.frequencyCount++;
    }

    obj.funnel.impressions += funnel.impressions;
    obj.funnel.linkClicks += funnel.linkClicks;
    obj.funnel.landingViews += funnel.landingViews;
    obj.funnel.conversions += funnel.conversions;
  });

  // Calculate averages for objectives
  Object.values(report.objectives).forEach(obj => {
    if (obj.isCpmBased) {
      obj.cpa = obj.reach > 0 ? (obj.spend / obj.reach) * 1000 : 0;
    } else {
      obj.cpa = obj.result > 0 ? (obj.spend / obj.result) : 0;
    }
    
    obj.ctr = obj.impressions > 0 ? (obj.clicks / obj.impressions) * 100 : 0;
    obj.avgFrequency = obj.frequencyCount > 0 ? (obj.frequencySum / obj.frequencyCount) : 1;
    
    // Funnel conversion rates
    obj.funnel.ctr = obj.funnel.impressions > 0 ? (obj.funnel.linkClicks / obj.funnel.impressions) * 100 : 0;
    obj.funnel.lpvRate = obj.funnel.linkClicks > 0 ? (obj.funnel.landingViews / obj.funnel.linkClicks) * 100 : 0;
    obj.funnel.convRate = obj.funnel.landingViews > 0 
        ? (obj.funnel.conversions / obj.funnel.landingViews) * 100 
        : (obj.funnel.linkClicks > 0 ? (obj.funnel.conversions / obj.funnel.linkClicks) * 100 : 0);
  });

  // Global Health logic
  const overallCtr = report.summary.totalImpressions > 0 ? (report.summary.totalClicks / report.summary.totalImpressions) * 100 : 0;
  report.summary.overallCtr = overallCtr;
  if (overallCtr < 0.8) report.summary.health = 'CRÍTICO';
  else if (overallCtr < 1.2) report.summary.health = 'ATENÇÃO';
  else report.summary.health = 'BOM';

  return report;
};
