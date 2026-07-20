export const fetchMetaAdsData = async (accountId, token, since, until) => {
  const url = `https://graph.facebook.com/v19.0/act_${accountId}/insights`;
  const params = new URLSearchParams({
    access_token: token,
    level: 'campaign',
    fields: 'campaign_name,spend,impressions,clicks,reach,frequency,actions,cost_per_action_type,objective',
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
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return data.data || [];
};

// Helper to extract specific action count from Meta's complex actions array
const getActionCount = (actions, actionType) => {
  if (!actions || !Array.isArray(actions)) return 0;
  
  // Custom logic for finding specific actions
  if (actionType === 'lead') {
    const leadAction = actions.find(a => 
      a.action_type === 'lead' || 
      a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
      a.action_type === 'onsite_conversion.messaging_first_reply'
    );
    return leadAction ? parseFloat(leadAction.value) : 0;
  }
  
  if (actionType === 'landing_page_view') {
    const lpvAction = actions.find(a => a.action_type === 'landing_page_view');
    return lpvAction ? parseFloat(lpvAction.value) : 0;
  }
  
  return 0;
};

const getObjectiveLabel = (objective, name = '') => {
  const objLower = (objective || '').toLowerCase();
  const nameLower = name.toLowerCase();
  if (objLower.includes('messages') || objLower.includes('lead') || nameLower.includes('lead') || nameLower.includes('mensagem')) return 'Conversas/Leads';
  if (objLower.includes('link_clicks') || objLower.includes('traffic')) return 'Cliques/Tráfego';
  if (objLower.includes('reach') || objLower.includes('brand_awareness')) return 'Alcance';
  return 'Resultados';
};

const isLeadObjective = (objective, name) => {
  const label = getObjectiveLabel(objective, name);
  return label === 'Conversas/Leads';
};

export const processApiData = (insightsData, campaignsData) => {
  let totalInvested = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalReach = 0;
  
  let funnelInvested = 0;
  let leads = 0;
  let visits = 0;
  
  let sumFreq = 0;
  let freqCount = 0;
  
  const activeCampaigns = [];

  // Map status from campaigns call to insights
  const statusMap = {};
  campaignsData.forEach(c => {
    statusMap[c.name] = c.status;
  });

  insightsData.forEach(row => {
    const name = row.campaign_name;
    if (!name || name.startsWith('Resultados de')) return;

    const valorUsado = parseFloat(row.spend || 0);
    const imp = parseFloat(row.impressions || 0);
    const clk = parseFloat(row.clicks || 0);
    const alc = parseFloat(row.reach || 0);
    const freq = parseFloat(row.frequency || 0);
    
    // Actions
    const resLeads = getActionCount(row.actions, 'lead');
    const resVisits = getActionCount(row.actions, 'landing_page_view');

    const objective = row.objective || '';
    const resultType = getObjectiveLabel(objective, name);
    const status = statusMap[name] || 'ACTIVE';
    const isLeadObj = isLeadObjective(objective, name);

    totalInvested += valorUsado;
    totalImpressions += imp;
    totalClicks += clk;
    totalReach += alc;
    
    if (freq > 0) {
      sumFreq += freq;
      freqCount++;
    }

    if (isLeadObj) {
      leads += resLeads;
      funnelInvested += valorUsado;
    }
    
    visits += resVisits;

    const cpl = resLeads > 0 ? (valorUsado / resLeads) : 0;

    const campaignObj = {
      name,
      invested: valorUsado,
      results: isLeadObj ? resLeads : (resVisits || clk),
      resultType: isLeadObj ? 'Leads' : resultType,
      cpl,
      impressions: imp,
      clicks: clk,
      reach: alc,
      freq,
      status: status.toLowerCase()
    };
    
    if (status === 'ACTIVE' || valorUsado > 0 || imp > 0) {
      activeCampaigns.push(campaignObj);
    }
  });

  const funnelImpressions = totalImpressions;
  const funnelClicks = totalClicks;

  const cpl = leads > 0 ? (funnelInvested / leads) : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const funnelCtr = ctr;
  const avgFreq = freqCount > 0 ? (sumFreq / freqCount) : 1;

  return {
    invested: totalInvested,
    funnelInvested,
    impressions: totalImpressions,
    clicks: totalClicks,
    reach: totalReach,
    leads,
    visits,
    cpl,
    ctr,
    funnelImpressions,
    funnelClicks,
    funnelCtr,
    avgFreq,
    activeCampaigns
  };
};

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const formatNumber = (val) => new Intl.NumberFormat('pt-BR').format(val || 0);

export const generateDashboardData = (data7Days, dataAcc) => {
  // Insights Alert Logic
  const alerts = [];
  data7Days.activeCampaigns.forEach(c => {
    if (c.freq > 3 && c.impressions > 1000) {
      alerts.push({ type: 'warning', text: `[${c.name}] está com frequência ${c.freq.toFixed(2)} — indício de saturação.` });
    }
  });
  
  const leadCamps = data7Days.activeCampaigns.filter(c => c.resultType === 'Leads' && c.results > 0);
  if (leadCamps.length > 0) {
    const avgCPL = leadCamps.reduce((acc, curr) => acc + curr.cpl, 0) / leadCamps.length;
    leadCamps.forEach(c => {
      if (c.cpl > avgCPL * 1.5) {
        alerts.push({ type: 'danger', text: `[${c.name}] tem CPL de ${formatCurrency(c.cpl)}, muito acima da média.` });
      }
    });
    
    if (leadCamps.length >= 2) {
      const sorted = [...leadCamps].sort((a,b) => a.cpl - b.cpl);
      const best = sorted[0];
      const worst = sorted[sorted.length-1];
      if (worst.cpl > best.cpl * 1.5 && best.cpl > 0) {
         alerts.push({ type: 'success', text: `Considere realocar orçamento de [${worst.name}] para [${best.name}] (CPL ${formatCurrency(best.cpl)}).` });
      }
    }
  }

  const dashboardData = {
    summary: `Este período teve investimento total de ${formatCurrency(data7Days.invested)}, gerando ${formatNumber(data7Days.leads)} leads a um CPL focado de ${formatCurrency(data7Days.cpl)}.`,
    alerts,
    topStats: {
      invested: { value: formatCurrency(data7Days.invested), subtitle: "investidos", details: "Total da conta" },
      leads: { value: formatNumber(data7Days.leads), subtitle: "leads (funil)", details: "Campanhas de conversão" },
      cpl: { value: formatCurrency(data7Days.cpl), subtitle: "CPL das conversões", details: `histórico: ${formatCurrency(dataAcc.cpl)}` },
      ctr: { value: `${data7Days.ctr.toFixed(2)}%`, subtitle: "CTR Geral", details: "Taxa de cliques média" }
    },
    funnel: {
      impressions: { value: formatNumber(data7Days.funnelImpressions), label: "Impressões do Funil", details: "Apenas campanhas de Lead" },
      clicks: { value: formatNumber(data7Days.funnelClicks), label: "Cliques no link", details: `CTR do funil ${data7Days.funnelCtr.toFixed(2)}%` },
      visits: { value: formatNumber(data7Days.visits), label: "Visitas landing", details: "Tráfego que chegou" },
      leads: { value: formatNumber(data7Days.leads), label: "Leads/Conversas", details: `CPL ${formatCurrency(data7Days.cpl)}` }
    },
    topStatsAcc: {
      invested: { value: formatCurrency(dataAcc.invested), subtitle: "investidos", details: "Acumulado" },
      leads: { value: formatNumber(dataAcc.leads), subtitle: "leads totais", details: "Acumulado" },
      cpl: { value: formatCurrency(dataAcc.cpl), subtitle: "CPL Geral", details: "Custo médio longo prazo" },
      ctr: { value: `${dataAcc.ctr.toFixed(2)}%`, subtitle: "CTR Geral", details: "Taxa de cliques" }
    },
    funnelAcc: {
      impressions: { value: formatNumber(dataAcc.funnelImpressions), label: "Impressões do Funil", details: "Apenas campanhas de Lead" },
      clicks: { value: formatNumber(dataAcc.funnelClicks), label: "Cliques no link", details: `CTR do funil ${dataAcc.funnelCtr.toFixed(2)}%` },
      visits: { value: formatNumber(dataAcc.visits), label: "Visitas landing", details: "Tráfego que chegou" },
      leads: { value: formatNumber(dataAcc.leads), label: "Leads/Conversas", details: `CPL ${formatCurrency(dataAcc.cpl)}` }
    },
    accumulatedCard: {
      label: "RESUMO GERAL ACUMULADO",
      spent: formatCurrency(dataAcc.invested),
      leadsTotal: `${formatNumber(dataAcc.leads)} leads`,
      leadsBreakdown: `(Alcance Histórico: ${formatNumber(dataAcc.reach)})`,
      cpl: `CPL focado ${formatCurrency(dataAcc.cpl)}`,
      freq: `freq. média ${(dataAcc.avgFreq).toFixed(2)}`
    },
    activeCampaigns: data7Days.activeCampaigns
      .filter(c => !(c.invested === 0 && c.status === 'inactive'))
      .map(c => ({
        name: c.name,
        invested: formatCurrency(c.invested),
        rawInvested: c.invested,
        results: `${formatNumber(c.results)} ${c.resultType}`,
        cpl: formatCurrency(c.cpl),
        rawCpl: c.cpl,
        impressions: formatNumber(c.impressions),
        clicks: formatNumber(c.clicks),
        resultType: c.resultType
      }))
  };

  return dashboardData;
};

export const generateSinglePeriodData = (processedData, labelText) => {
  return {
    topStats: {
      invested: { value: formatCurrency(processedData.invested), subtitle: "investidos", details: labelText },
      leads: { value: formatNumber(processedData.leads), subtitle: "leads totais", details: labelText },
      cpl: { value: formatCurrency(processedData.cpl), subtitle: "CPL focado", details: labelText },
      ctr: { value: `${processedData.ctr.toFixed(2)}%`, subtitle: "CTR Geral", details: labelText }
    },
    funnel: {
      impressions: { value: formatNumber(processedData.funnelImpressions), label: "Impressões do Funil", details: "Apenas campanhas de Lead" },
      clicks: { value: formatNumber(processedData.funnelClicks), label: "Cliques no link", details: `CTR do funil ${processedData.funnelCtr.toFixed(2)}%` },
      visits: { value: formatNumber(processedData.visits), label: "Visitas landing", details: "Tráfego que chegou" },
      leads: { value: formatNumber(processedData.leads), label: "Leads/Conversas", details: `CPL ${formatCurrency(processedData.cpl)}` }
    }
  };
};
