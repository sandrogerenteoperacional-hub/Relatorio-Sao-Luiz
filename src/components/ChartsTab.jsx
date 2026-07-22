import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import CustomDateFilter from './CustomDateFilter';
import { fetchDailyInsights, fetchMetaAdsData, getObjectiveGroup } from '../services/metaApi';
import { TrendingUp, Users, Eye, Target, MousePointerClick, CircleDollarSign, Filter } from 'lucide-react';
import { CustomFunnel } from './CustomFunnel';

const COLORS = ['#00FF80', '#A855F7', '#3B82F6', '#EF4444', '#F59E0B', '#ec4899'];

export const ChartsTab = ({ accountId, token }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [timelineData, setTimelineData] = useState([]);
  const [budgetData, setBudgetData] = useState([]);
  const [kpiData, setKpiData] = useState(null);
  const [campaignsData, setCampaignsData] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('all');

  const formatDateStr = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}`;
  };

  const handleSearchDates = async (startDate, endDate) => {
    if (!accountId || !token) {
      setError('Conta não configurada.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const daily = await fetchDailyInsights(accountId, token, startDate, endDate);
      
      const timeline = daily.map(day => {
        const spend = parseFloat(day.spend || 0);
        let leads = 0;
        if (day.actions) {
           day.actions.forEach(act => {
              if (act.action_type.includes('lead') || act.action_type.includes('messaging_conversation_started')) {
                 leads += parseInt(act.value, 10);
              }
           });
        }
        return {
          date: formatDateStr(day.date_start),
          Investimento: spend,
          Leads: leads
        };
      });
      setTimelineData(timeline);

      const campaigns = await fetchMetaAdsData(accountId, token, startDate, endDate);
      setCampaignsData(campaigns);
      
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalLeads = 0;
      let totalSpend = 0;
      let totalReach = 0;
      
      const budgetMap = {};

      campaigns.forEach(camp => {
        const group = getObjectiveGroup(camp.objective, camp.campaign_name);
        const spend = parseFloat(camp.spend || 0);
        
        if (!budgetMap[group]) budgetMap[group] = 0;
        budgetMap[group] += spend;
        totalSpend += spend;
        
        totalImpressions += parseInt(camp.impressions || 0, 10);
        totalClicks += parseInt(camp.clicks || 0, 10);
        totalReach += parseInt(camp.reach || 0, 10);
        
        if (camp.actions) {
          camp.actions.forEach(a => {
            if (a.action_type.includes('lead') || a.action_type.includes('messaging_conversation_started')) {
              totalLeads += parseInt(a.value, 10);
            }
          });
        }
      });

      setBudgetData(Object.keys(budgetMap).map(key => ({
        name: key,
        value: budgetMap[key]
      })).filter(item => item.value > 0).sort((a,b) => b.value - a.value));

      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
      
      setKpiData({
        impressions: totalImpressions,
        reach: totalReach,
        cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        frequency: totalReach > 0 ? (totalImpressions / totalReach) : 0,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        clicks: totalClicks,
        leads: totalLeads,
        cpa: totalLeads > 0 ? (totalSpend / totalLeads) : 0,
        spend: totalSpend,
        projection: diffDays > 0 ? (totalSpend / diffDays) * 30 : 0
      });

    } catch (err) {
      setError('Erro ao buscar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentFunnelData = useMemo(() => {
    if (!campaignsData || campaignsData.length === 0) return null;
    
    let impressions = 0;
    let reach = 0;
    let clicks = 0;
    let leads = 0;
    let sales = 0;
    let spend = 0;

    const filtered = selectedCampaign === 'all' 
      ? campaignsData 
      : campaignsData.filter(c => c.campaign_name === selectedCampaign);

    filtered.forEach(camp => {
      impressions += parseInt(camp.impressions || 0, 10);
      reach += parseInt(camp.reach || 0, 10);
      clicks += parseInt(camp.clicks || 0, 10);
      spend += parseFloat(camp.spend || 0);

      if (camp.actions) {
        camp.actions.forEach(a => {
          if (a.action_type.includes('lead') || a.action_type.includes('messaging_conversation_started')) {
            leads += parseInt(a.value, 10);
          }
          if (a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase') {
            sales += parseInt(a.value, 10);
          }
        });
      }
    });

    const frequency = reach > 0 ? impressions / reach : 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const conversionRate = clicks > 0 ? (leads / clicks) * 100 : 0;
    const cpa = leads > 0 ? spend / leads : 0;

    return {
      impressions, reach, frequency, clicks, ctr, leads, conversionRate, sales, cpa
    };
  }, [campaignsData, selectedCampaign]);

  const activeCampaignNames = useMemo(() => {
    return Array.from(new Set(campaignsData.map(c => c.campaign_name))).sort();
  }, [campaignsData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', padding: '15px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', color: 'white' }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>{label}</p>
          {payload.map((entry, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.9rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: entry.color || entry.fill }}></div>
              <span style={{ color: 'var(--text-muted)' }}>{entry.name}:</span>
              <span style={{ fontWeight: 'bold' }}>
                {entry.name === 'Investimento' || entry.name.includes('Orçamento') || entry.name === 'value' && entry.payload.name 
                  ? `R$ ${parseFloat(entry.value).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}` 
                  : entry.value.toLocaleString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  
  const KpiCard = ({ title, value, icon, subValue, subLabel }) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ color: 'var(--neon-green)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '1px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {icon} {title}
      </div>
      <div style={{ color: 'white', fontSize: '1.8rem', fontWeight: 'bold', marginBottom: subValue ? '0.25rem' : '0' }}>
        {value}
      </div>
      {subValue && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {subLabel}: <span style={{ color: 'white' }}>{subValue}</span>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'white', margin: 0 }}>Gráficos & Inteligência</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Selecione o Período</h3>
        <CustomDateFilter onSearch={handleSearchDates} isSearching={loading} />
      </div>

      {error && (
        <div style={{ background: 'rgba(255, 50, 50, 0.1)', border: '1px solid rgba(255, 50, 50, 0.3)', padding: '1rem', borderRadius: '8px', color: '#ffaaaa', marginBottom: '2rem', textAlign: 'center' }}>
          ⚠️ {error}
        </div>
      )}

      {timelineData.length === 0 && !loading && !error && (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
          Selecione o período acima para gerar os gráficos e KPIs.
        </div>
      )}

      {timelineData.length > 0 && kpiData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <KpiCard title="Impressões" value={kpiData.impressions.toLocaleString('pt-BR')} icon={<Eye size={16} />} />
            <KpiCard title="Alcance" value={kpiData.reach.toLocaleString('pt-BR')} icon={<Users size={16} />} />
            <KpiCard title="CPM" value={`R$ ${kpiData.cpm.toFixed(2).replace('.', ',')}`} icon={<TrendingUp size={16} />} />
            <KpiCard title="Frequência" value={kpiData.frequency.toFixed(2)} icon={<TrendingUp size={16} />} />
            <KpiCard title="CTR" value={`${kpiData.ctr.toFixed(2)}%`} icon={<MousePointerClick size={16} />} />
            <KpiCard title="Cliques" value={kpiData.clicks.toLocaleString('pt-BR')} icon={<MousePointerClick size={16} />} />
            <KpiCard title="Contatos" value={kpiData.leads.toLocaleString('pt-BR')} icon={<Users size={16} />} />
            <KpiCard title="Custo p/ Contato" value={`R$ ${kpiData.cpa.toFixed(2).replace('.', ',')}`} icon={<Target size={16} />} />
            <KpiCard 
              title="Investimento" 
              value={`R$ ${kpiData.spend.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}`} 
              icon={<CircleDollarSign size={16} />} 
              subLabel="Projeção 30 dias" 
              subValue={`R$ ${kpiData.projection.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}`}
            />
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem' }}>
            <h3 style={{ color: 'white', marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem' }}>Evolução de Investimento vs Leads</h3>
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00FF80" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00FF80" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis yAxisId="left" stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} axisLine={false} tickLine={false} dx={-10} tickFormatter={(val) => `R$${val}`} />
                  <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} axisLine={false} tickLine={false} dx={10} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area yAxisId="left" type="monotone" dataKey="Investimento" stroke="#A855F7" strokeWidth={3} fillOpacity={1} fill="url(#colorInvest)" activeDot={{r: 6, fill: '#A855F7', stroke: '#fff', strokeWidth: 2}} />
                  <Area yAxisId="right" type="monotone" dataKey="Leads" stroke="#00FF80" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" activeDot={{r: 6, fill: '#00FF80', stroke: '#fff', strokeWidth: 2}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'white', margin: 0, fontSize: '1.1rem' }}>O Funil</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Filter size={14} color="var(--text-muted)" />
                  <select 
                    value={selectedCampaign} 
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    <option value="all" style={{ color: 'black' }}>Todas as Campanhas</option>
                    {activeCampaignNames.map(name => (
                      <option key={name} value={name} style={{ color: 'black' }}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {currentFunnelData && <CustomFunnel data={currentFunnelData} />}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: 'white', marginTop: 0, marginBottom: '0', fontSize: '1.1rem' }}>Distribuição de Orçamento</h3>
              <div style={{ width: '100%', height: 300, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={budgetData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {budgetData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginTop: '-1rem' }}>
                {budgetData.map((entry, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></div>
                    <span style={{ color: 'white', fontSize: '0.85rem' }}>{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
