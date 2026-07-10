import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dirPath = __dirname;

function parseNumber(str) {
  if (!str) return 0;
  const cleanStr = String(str).replace(',', '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

function getResultLabel(indicator) {
  const ind = (indicator || '').toLowerCase();
  if (ind.includes('messaging') || ind.includes('conversation')) return 'Conversas';
  if (ind.includes('lead')) return 'Leads';
  if (ind.includes('landing_page_view')) return 'Visitas à pág.';
  if (ind.includes('link_click')) return 'Cliques no link';
  if (ind.includes('reach') || ind.includes('brand_awareness')) return 'Alcance';
  if (ind.includes('profile_visit')) return 'Visitas ao perfil';
  return 'Resultados';
}

function isLeadObjective(indicator) {
  const label = getResultLabel(indicator);
  return label === 'Conversas' || label === 'Leads';
}

function processCSVFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf-8');
  const results = Papa.parse(content, { header: true, skipEmptyLines: true });
  
  let totalInvested = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalReach = 0;
  
  let funnelInvested = 0;
  let funnelImpressions = 0;
  let funnelClicks = 0;
  let leads = 0;
  let visits = 0; // if tracked
  
  let sumFreq = 0;
  let freqCount = 0;
  
  const campaigns = [];
  const activeCampaigns = [];

  for (const row of results.data) {
    if (!row['Nome da campanha'] || row['Nome da campanha'].startsWith('Resultados de')) continue;

    const name = row['Nome da campanha'];
    const valorUsado = parseNumber(row['Valor usado (BRL)']);
    const imp = parseNumber(row['Impressões']);
    const clk = parseNumber(row['Cliques no link']);
    const alc = parseNumber(row['Alcance']);
    const res = parseNumber(row['Resultados']);
    const freq = parseNumber(row['Frequência']);
    const cpl = parseNumber(row['Custo por resultados']);
    const indicator = row['Indicador de resultados'];
    const resultType = getResultLabel(indicator);
    const veiculacao = (row['Veiculação da campanha'] || '').toLowerCase();
    
    totalInvested += valorUsado;
    totalImpressions += imp;
    totalClicks += clk;
    totalReach += alc;
    
    if (freq > 0) {
      sumFreq += freq;
      freqCount++;
    }

    if (isLeadObjective(indicator)) {
      leads += res;
      funnelInvested += valorUsado;
    }
    
    if (resultType === 'Visitas à pág.') {
      visits += res;
    }

    const campaignObj = {
      name,
      invested: valorUsado,
      results: res,
      resultType,
      indicator,
      cpl,
      impressions: imp,
      clicks: clk,
      reach: alc,
      freq,
      status: veiculacao
    };
    
    campaigns.push(campaignObj);

    if (veiculacao === 'active' || veiculacao === 'not_delivering' || valorUsado > 0 || imp > 0) {
      activeCampaigns.push(campaignObj);
    }
  }

  // Use total account data for the macro funnel
  funnelImpressions = totalImpressions;
  funnelClicks = totalClicks;

  // CPL is strictly calculated from Lead/Messaging campaigns investment
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
    activeCampaigns,
    allCampaigns: campaigns
  };
}

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val) => new Intl.NumberFormat('pt-BR').format(val);

function calculateInsights(data) {
  const alerts = [];
  
  // 1. Frequência Alta
  data.activeCampaigns.forEach(c => {
    if (c.freq > 3 && c.impressions > 1000) {
      alerts.push({ type: 'warning', text: `⚠️ [${c.name}] está com frequência ${c.freq.toFixed(2)} — indício de saturação de audiência, recomenda-se renovar criativo ou expandir público.` });
    }
  });
  
  // 2. CPL fora da curva
  const leadCamps = data.activeCampaigns.filter(c => isLeadObjective(c.indicator) && c.results > 0);
  if (leadCamps.length > 0) {
    const avgCPL = leadCamps.reduce((acc, curr) => acc + curr.cpl, 0) / leadCamps.length;
    leadCamps.forEach(c => {
      if (c.cpl > avgCPL * 1.5) {
        alerts.push({ type: 'danger', text: `🚨 [${c.name}] tem custo por lead de ${formatCurrency(c.cpl)}, muito acima da média das campanhas ativas (${formatCurrency(avgCPL)}).` });
      }
    });
    
    // 3. Oportunidade
    if (leadCamps.length >= 2) {
      const sorted = [...leadCamps].sort((a,b) => a.cpl - b.cpl);
      const best = sorted[0];
      const worst = sorted[sorted.length-1];
      if (worst.cpl > best.cpl * 1.5 && best.cpl > 0) {
         alerts.push({ type: 'success', text: `💡 Considere realocar orçamento de [${worst.name}] para [${best.name}], que está gerando leads muito mais barato (${formatCurrency(best.cpl)}).` });
      }
    }
  }



  return alerts;
}

function calcVariation(curr, prev, inverse = false) {
  if (!prev || prev === 0) return null;
  const pct = ((curr - prev) / prev) * 100;
  const isGood = inverse ? pct < 0 : pct > 0;
  return {
    val: Math.abs(pct).toFixed(1) + '%',
    dir: pct > 0 ? 'up' : 'down',
    color: isGood ? 'green' : 'red',
    raw: pct
  };
}

function main() {
  const files = fs.readdirSync(dirPath);
  const csvFiles = files.filter(f => f.endsWith('.csv'));
  
  if (csvFiles.length === 0) {
    console.log("Nenhum arquivo CSV encontrado.");
    return;
  }

  // Very basic heuristic for files
  let file7Days = csvFiles.find(f => f.toLowerCase().includes('7 dias'));
  let fileAccumulated = csvFiles.find(f => f.toLowerCase().includes('junho') || f.toLowerCase().includes('acumulado')); 
  let filePrev = csvFiles.find(f => f.toLowerCase().includes('anterior') || f.toLowerCase().includes('passada')); 

  if (!file7Days && csvFiles.length > 0) file7Days = csvFiles[0];
  if (!fileAccumulated) fileAccumulated = file7Days;

  const data7Days = processCSVFile(path.join(dirPath, file7Days));
  const dataAcc = processCSVFile(path.join(dirPath, fileAccumulated));
  const dataPrev = filePrev ? processCSVFile(path.join(dirPath, filePrev)) : null;

  const insights = calculateInsights(data7Days);

  const varInvested = dataPrev ? calcVariation(data7Days.invested, dataPrev.invested) : null;
  const varLeads = dataPrev ? calcVariation(data7Days.leads, dataPrev.leads) : null;
  const varCpl = dataPrev ? calcVariation(data7Days.cpl, dataPrev.cpl, true) : null;
  const varCtr = dataPrev ? calcVariation(data7Days.ctr, dataPrev.ctr) : null;

  let execSummary = `Este período teve investimento total de ${formatCurrency(data7Days.invested)}`;
  if (varInvested) execSummary += ` (${varInvested.dir === 'up'?'+':'-'}${varInvested.val} vs anterior)`;
  execSummary += `, gerando ${formatNumber(data7Days.leads)} leads a um CPL focado de ${formatCurrency(data7Days.cpl)}.`;
  
  if (insights.length > 0) {
    execSummary += ` Atenção principal: ${insights[0].text.replace(/^[⚠️🚨💡ℹ️]\s*/u, '')}`;
  }

  const dashboardData = {
    summary: execSummary,
    alerts: insights,
    topStats: {
      invested: { value: formatCurrency(data7Days.invested), subtitle: "investidos", details: "Total da conta", variation: varInvested },
      leads: { value: formatNumber(data7Days.leads), subtitle: "leads (funil)", details: "Campanhas de conversão", variation: varLeads },
      cpl: { value: formatCurrency(data7Days.cpl), subtitle: "CPL das conversões", details: `histórico: ${formatCurrency(dataAcc.cpl)}`, variation: varCpl },
      ctr: { value: `${data7Days.ctr.toFixed(2)}%`, subtitle: "CTR Geral", details: "Taxa de cliques média", variation: varCtr }
    },
    funnel: {
      impressions: { value: formatNumber(data7Days.funnelImpressions), label: "Impressões do Funil", details: "Apenas campanhas de Lead" },
      clicks: { value: formatNumber(data7Days.funnelClicks), label: "Cliques no link", details: `CTR do funil ${data7Days.funnelCtr.toFixed(2)}%` },
      visits: { value: formatNumber(data7Days.visits), label: "Visitas landing", details: "Tráfego que chegou" },
      leads: { value: formatNumber(data7Days.leads), label: "Leads/Conversas", details: `CPL ${formatCurrency(data7Days.cpl)}` }
    },
    topStatsAcc: {
      invested: { value: formatCurrency(dataAcc.invested), subtitle: "investidos", details: "Desde junho" },
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
      })),
    pausedZeroSpendCount: data7Days.allCampaigns.filter(c => c.status === 'inactive' && c.invested === 0).length
  };

  const publicDir = path.join(dirPath, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(path.join(publicDir, 'data.json'), JSON.stringify(dashboardData, null, 2));
  console.log('✅ public/data.json atualizado com regras avançadas!');
}

main();
