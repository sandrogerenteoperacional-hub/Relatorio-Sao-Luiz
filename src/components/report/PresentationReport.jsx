import React from 'react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Target, TrendingUp, AlertTriangle, CheckCircle, Activity, Award, BarChart2, Zap, Download } from 'lucide-react';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const formatNumber = (val) => new Intl.NumberFormat('pt-BR').format(val || 0);

// --- 1. CAPA / RESUMO EXECUTIVO ---
const ExecutiveSummary = ({ summary, accountId, label, campaigns }) => {
  const isHealthy = summary.health === 'BOM';
  const isCritical = summary.health === 'CRÍTICO';
  
  const handleExportCSV = () => {
    if (!campaigns || campaigns.length === 0) return;
    
    const headers = ['Campanha', 'Grupo/Objetivo', 'Status', 'Investimento (BRL)', 'Impressões', 'Cliques', 'Alcance', 'Frequência', 'CPC (BRL)', 'CPM (BRL)', 'CTR (%)', 'Resultados', 'Tipo de Resultado', 'CPA (BRL)', 'Debug Actions JSON'];
    
    const rows = campaigns.map(c => [
      `"${c.name}"`,
      `"${c.group}"`,
      `"${c.status}"`,
      c.spend.toFixed(2),
      c.impressions,
      c.clicks,
      c.reach,
      c.frequency.toFixed(2),
      c.cpc.toFixed(2),
      c.cpm.toFixed(2),
      c.ctr.toFixed(2),
      c.result,
      `"${c.resultName}"`,
      c.cpa.toFixed(2),
      `"${c.rawActions ? c.rawActions.replace(/"/g, '""') : ''}"`
    ].join(','));
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    // Adicionar BOM para Excel abrir UTF-8 corretamente
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_meta_ads_${accountId}_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: isHealthy ? 'var(--neon-green)' : (isCritical ? '#ff4444' : '#ffb020') }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.2rem', color: 'white', fontWeight: '800', letterSpacing: '-0.02em' }}>Dashboard Premium <span style={{ color: 'var(--neon-green)', textShadow: '0 0 15px var(--neon-green-glow)' }}>Supermercado São Luiz</span></h1>
          <div style={{ color: 'var(--text-muted)', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span>CONTA: <strong>ACT_{accountId}</strong></span>
            <span>•</span>
            <span>PERÍODO: <strong>{label.toUpperCase()}</strong></span>
          </div>
        </div>
        
        <button 
          onClick={handleExportCSV}
          style={{
            background: 'var(--neon-green)', color: 'var(--bg-dark)', border: 'none', borderRadius: '8px',
            padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold',
            cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Download size={18} />
          Exportar CSV
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Investimento Total</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--neon-green)' }}>{formatCurrency(summary.invested)}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Campanhas Ativas</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{summary.activeCampaignsCount}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Saúde da Conta (CTR Global)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isHealthy ? <CheckCircle color="var(--neon-green)" size={28} /> : (isCritical ? <AlertTriangle color="#ff4444" size={28} /> : <Activity color="#ffb020" size={28} />)}
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isHealthy ? 'var(--neon-green)' : (isCritical ? '#ff4444' : '#ffb020') }}>
              {summary.health} <span style={{fontSize: '1rem', opacity: 0.8}}>({summary.overallCtr.toFixed(2)}%)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 2. VISÃO GERAL DA CONTA ---
const COLORS = ['var(--neon-green)', '#00e5ff', '#ffb020', '#ff4444', '#b020ff'];

const AccountOverview = ({ objectives }) => {
  const pieData = Object.values(objectives).map(obj => ({
    name: obj.name,
    value: obj.spend
  }));

  return (
    <div style={{ marginBottom: '3rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', marginBottom: '1.5rem' }}><BarChart2 /> Distribuição de Verba</h2>
      <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', height: '350px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value" stroke="none">
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip 
              formatter={(value) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- 3. QUEBRA POR OBJETIVO ---
const ObjectiveBreakdown = ({ objectives }) => {
  return (
    <div style={{ marginBottom: '3rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', marginBottom: '1.5rem' }}><Target /> Desempenho por Objetivo</h2>
      
      {Object.values(objectives).map(obj => (
        <div key={obj.name} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--neon-green)' }}>{obj.name}</h3>
            <div style={{ textAlign: 'right' }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>{obj.campaignCount} campanha(s)</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Investimento</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{formatCurrency(obj.spend)}</div>
            </div>
            <div className="card" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Resultados ({obj.resultName})</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white' }}>{formatNumber(obj.result)}</div>
            </div>
            <div className="card" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{obj.isCpmBased ? 'Custo / 1.000 Alcançadas' : 'Custo por Resultado'}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--neon-green)' }}>{formatCurrency(obj.cpa)}</div>
            </div>
            <div className="card" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>CTR Médio</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{obj.ctr.toFixed(2)}%</div>
            </div>
            <div className="card" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>CPM Médio</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{formatCurrency(obj.avgCpm)}</div>
            </div>
            <div className="card" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Frequência</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{obj.avgFrequency.toFixed(2)}</div>
            </div>
            {obj.followers > 0 && (
              <div className="card" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Seguidores (Tracking)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--neon-green)' }}>{formatNumber(obj.followers)}</div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// --- 5. RANKING DE CAMPANHAS ---
const CampaignRanking = ({ campaigns }) => {
  const sorted = [...campaigns].filter(c => c.spend > 0).sort((a, b) => {
    // Ordenar primeiro por grupo, depois por CPA
    if (a.group < b.group) return -1;
    if (a.group > b.group) return 1;
    return a.cpa - b.cpa;
  });

  return (
    <div style={{ marginBottom: '3rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', marginBottom: '1.5rem' }}><Award /> Ranking de Eficiência</h2>
      <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <th style={{ padding: '1rem' }}>Campanha</th>
              <th style={{ padding: '1rem' }}>Objetivo</th>
              <th style={{ padding: '1rem' }}>Investimento</th>
              <th style={{ padding: '1rem' }}>Resultados</th>
              <th style={{ padding: '1rem' }}>Custo p/ Res.</th>
              <th style={{ padding: '1rem' }}>CTR</th>
              <th style={{ padding: '1rem' }}>Status/Fadiga</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const fatigue = c.frequency > 3;
              return (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                  <td style={{ padding: '1rem', color: 'white', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</td>
                  <td style={{ padding: '1rem' }}><span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{c.group}</span></td>
                  <td style={{ padding: '1rem', color: 'var(--neon-green)' }}>{formatCurrency(c.spend)}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{formatNumber(c.result)}</td>
                  <td style={{ padding: '1rem' }}>{formatCurrency(c.cpa)}</td>
                  <td style={{ padding: '1rem' }}>{c.ctr.toFixed(2)}%</td>
                  <td style={{ padding: '1rem' }}>
                    {fatigue ? (
                      <span style={{ color: '#ffb020', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14}/> Fadiga (Freq {c.frequency.toFixed(1)})</span>
                    ) : (
                      <span style={{ color: 'var(--neon-green)' }}>Saudável</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- 6. TENDÊNCIA TEMPORAL ---
const TrendGraph = ({ currentData, previousData }) => {
  if (!previousData || !currentData) return null;

  const data = [
    { name: 'Período Anterior' },
    { name: 'Período Atual' }
  ];
  
  const groups = new Set([...Object.keys(currentData.objectives), ...Object.keys(previousData.objectives)]);
  
  groups.forEach(g => {
    const prev = previousData.objectives[g];
    const curr = currentData.objectives[g];
    data[0][g] = prev && prev.cpa > 0 ? prev.cpa : null;
    data[1][g] = curr && curr.cpa > 0 ? curr.cpa : null;
  });

  return (
    <div style={{ marginBottom: '3rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', marginBottom: '1.5rem' }}><TrendingUp /> Comparativo de Custo de Aquisição (CPA)</h2>
      <div className="card" style={{ padding: '2rem', height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" tickFormatter={(val) => `R$ ${val}`} />
            <RechartsTooltip 
              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ fontWeight: 'bold' }}
              formatter={(value) => formatCurrency(value)}
            />
            <Legend />
            {Array.from(groups).map((g, i) => (
              <Line key={g} type="monotone" dataKey={g} stroke={COLORS[i % COLORS.length]} strokeWidth={3} activeDot={{ r: 8 }} connectNulls={true} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- 7. e 8. DESTAQUES E RECOMENDAÇÕES ---
const InsightsAndRecommendations = ({ data }) => {
  const campaigns = data.campaigns.filter(c => c.spend > 0);
  
  let bestCamp = null;
  let worstCamp = null;
  const fatigued = [];
  const pausedWithSpend = campaigns.filter(c => !c.isActive && c.spend > 0);

  if (campaigns.length > 0) {
    // Find best and worst by comparing deviation from group average
    campaigns.forEach(c => {
      if (c.frequency > 3.5) fatigued.push(c);
      
      const groupAvg = data.objectives[c.group]?.cpa || 0;
      if (groupAvg > 0 && c.result > 0) {
        const efficiency = c.cpa / groupAvg; // < 1 is better
        if (!bestCamp || efficiency < (bestCamp.cpa / data.objectives[bestCamp.group].cpa)) bestCamp = c;
        if (!worstCamp || efficiency > (worstCamp.cpa / data.objectives[worstCamp.group].cpa)) worstCamp = c;
      }
    });
  }

  return (
    <div style={{ marginBottom: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
      
      <div style={{ background: 'rgba(0, 255, 136, 0.05)', border: '1px solid rgba(0, 255, 136, 0.2)', padding: '2rem', borderRadius: '12px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-green)', margin: '0 0 1.5rem 0' }}><Zap /> Destaques e Alertas</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem', color: 'white' }}>
          {bestCamp && (
            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ padding: '4px', background: 'rgba(0,255,136,0.1)', borderRadius: '50%' }}><Award size={16} color="var(--neon-green)"/></div>
              <div>
                <strong style={{ display: 'block', color: 'var(--neon-green)' }}>Campeã de Eficiência</strong>
                A campanha <em>"{bestCamp.name}"</em> está entregando {bestCamp.resultName} a {formatCurrency(bestCamp.cpa)}, muito abaixo da média do seu grupo.
              </div>
            </li>
          )}
          {worstCamp && worstCamp !== bestCamp && (
            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ padding: '4px', background: 'rgba(255,68,68,0.1)', borderRadius: '50%' }}><AlertTriangle size={16} color="#ff4444"/></div>
              <div>
                <strong style={{ display: 'block', color: '#ff4444' }}>Atenção no Custo</strong>
                A campanha <em>"{worstCamp.name}"</em> está com custo alto ({formatCurrency(worstCamp.cpa)}). Monitore de perto.
              </div>
            </li>
          )}
          {fatigued.length > 0 && (
            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ padding: '4px', background: 'rgba(255,176,32,0.1)', borderRadius: '50%' }}><Activity size={16} color="#ffb020"/></div>
              <div>
                <strong style={{ display: 'block', color: '#ffb020' }}>Fadiga de Anúncio</strong>
                {fatigued.length} campanha(s) passaram da frequência 3.5. O público está vendo o mesmo anúncio repetidas vezes.
              </div>
            </li>
          )}
        </ul>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '2rem', borderRadius: '12px' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', color: 'white' }}>Próximos Passos (Recomendações da IA)</h3>
        <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bestCamp && <li>Considere escalar o orçamento da campanha <strong>{bestCamp.name}</strong> em 20% para maximizar resultados.</li>}
          {fatigued.length > 0 && <li>Renove os criativos (vídeos/imagens) das campanhas com fadiga alta para recuperar o CTR.</li>}
          {worstCamp && worstCamp !== bestCamp && <li>Pause ou altere o público da campanha <strong>{worstCamp.name}</strong> para evitar desperdício de verba.</li>}
          {data.summary.overallCtr < 1 && <li>Seu CTR global está abaixo de 1%. Faça testes A/B com novas chamadas para ação (CTAs) e headlines mais agressivas.</li>}
          {!bestCamp && !worstCamp && fatigued.length === 0 && <li>A conta está rodando com estabilidade. Mantenha o monitoramento padrão.</li>}
        </ul>
      </div>

    </div>
  );
};

export const PresentationReport = ({ currentData, previousData, accountId, label }) => {
  if (!currentData) return null;

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease', width: '100%' }}>
      <ExecutiveSummary summary={currentData.summary} accountId={accountId} label={label} campaigns={currentData.campaigns} />
      <AccountOverview objectives={currentData.objectives} summary={currentData.summary} />
      <ObjectiveBreakdown objectives={currentData.objectives} />
      <CampaignRanking campaigns={currentData.campaigns} />
      <TrendGraph currentData={currentData} previousData={previousData} />
      <InsightsAndRecommendations data={currentData} />
    </div>
  );
};
