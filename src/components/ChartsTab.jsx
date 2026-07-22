import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, ComposedChart, Bar, LabelList
} from 'recharts';
import CustomDateFilter from './CustomDateFilter';
import { fetchDailyInsights, fetchMetaAdsData, getObjectiveGroup } from '../services/metaApi';

const COLORS = ['#00FF80', '#A855F7', '#3B82F6', '#EF4444', '#F59E0B', '#ec4899'];

export const ChartsTab = ({ accountId, token }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [timelineData, setTimelineData] = useState([]);
  const [funnelData, setFunnelData] = useState([]);
  const [budgetData, setBudgetData] = useState([]);

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
      
      // 1. Fetch Daily Data
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

      // 2. Fetch Aggregated Campaign Data for Funnel & Budget
      const { data: campaigns } = await fetchMetaAdsData(accountId, token, startDate, endDate);
      
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalLeads = 0;
      let totalVendas = 0;
      
      const budgetMap = {};

      campaigns.forEach(camp => {
        const group = getObjectiveGroup(camp.objective, camp.campaign_name);
        const spend = parseFloat(camp.spend || 0);
        
        // Budget
        if (!budgetMap[group]) budgetMap[group] = 0;
        budgetMap[group] += spend;
        
        // Funnel
        totalImpressions += parseInt(camp.impressions || 0, 10);
        totalClicks += parseInt(camp.clicks || 0, 10);
        
        if (camp.actions) {
          camp.actions.forEach(a => {
            if (a.action_type.includes('lead') || a.action_type.includes('messaging_conversation_started')) {
              totalLeads += parseInt(a.value, 10);
            }
            if (a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase') {
              totalVendas += parseInt(a.value, 10);
            }
          });
        }
      });

      setBudgetData(Object.keys(budgetMap).map(key => ({
        name: key,
        value: budgetMap[key]
      })).filter(item => item.value > 0).sort((a,b) => b.value - a.value));

      setFunnelData([
        { step: 'Impressões', value: totalImpressions, fill: '#3B82F6' },
        { step: 'Cliques', value: totalClicks, fill: '#A855F7' },
        { step: 'Leads', value: totalLeads, fill: '#ec4899' },
        { step: 'Vendas', value: totalVendas, fill: '#00FF80' }
      ]);

    } catch (err) {
      setError('Erro ao buscar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'white', margin: 0 }}>Gráficos & Funis</h1>
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
          Selecione o período acima para gerar os gráficos.
        </div>
      )}

      {timelineData.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Gráfico de Evolução */}
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
            
            {/* Funil Visual */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem' }}>
              <h3 style={{ color: 'white', marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem' }}>Funil de Conversão</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <ComposedChart data={funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="step" type="category" stroke="rgba(255,255,255,0.5)" axisLine={false} tickLine={false} width={80} tick={{fill: 'white', fontSize: 13}} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={<CustomTooltip />} />
                    <Bar dataKey="value" barSize={30} radius={[0, 15, 15, 0]}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <LabelList dataKey="value" position="right" fill="white" formatter={(val) => val.toLocaleString('pt-BR')} style={{fontWeight: 'bold'}} />
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Rosca de Orçamento */}
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
