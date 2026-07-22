import React, { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { Download, Loader2, CalendarDays, TrendingUp } from 'lucide-react';
import { PresentationReport } from './report/PresentationReport';
import { fetchDailyInsights } from '../services/metaApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const formatNumber = (val) => new Intl.NumberFormat('pt-BR').format(val || 0);
const formatPercent = (val) => `${(val || 0).toFixed(2)}%`;
const formatDecimal = (val) => (val || 0).toFixed(2);

const MiniChart = ({ title, data, dataKey, color, format }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 'bold' }}>{title}</div>
    <div style={{ height: '120px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
          <XAxis dataKey="date" stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickFormatter={(val) => val.split('/')[0]} tickLine={false} axisLine={false} minTickGap={10} />
          <YAxis domain={['auto', 'auto']} hide />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--bg-dark)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', padding: '4px 8px' }}
            itemStyle={{ fontWeight: 'bold', color }}
            labelStyle={{ display: 'none' }}
            formatter={(value) => [format ? format(value) : value, title]}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export const MonthlyReportTab = ({ accountId, token, dataMonth, dateRanges }) => {
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const reportRef = useRef(null);

  useEffect(() => {
    const loadDaily = async () => {
      if (!accountId || !token || !dateRanges?.current) return;
      try {
        setLoading(true);
        const { sinceMonth, untilMonth } = dateRanges.current;
        const daily = await fetchDailyInsights(accountId, token, sinceMonth, untilMonth);
        
        const timeline = daily.map(day => {
          const spend = parseFloat(day.spend || 0);
          const impressions = parseInt(day.impressions || 0, 10);
          const reach = parseInt(day.reach || 0, 10);
          const clicks = parseInt(day.clicks || 0, 10);
          let leads = 0;
          if (day.actions) {
             day.actions.forEach(act => {
                if (act.action_type.includes('lead') || act.action_type.includes('messaging_conversation_started')) {
                   leads += parseInt(act.value, 10);
                }
             });
          }
          
          const cpa = leads > 0 ? spend / leads : 0;
          const cpm = impressions > 0 ? spend / (impressions / 1000) : 0;
          const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
          const freq = reach > 0 ? impressions / reach : 0;
          
          return {
            date: day.date_start.split('-').slice(1).reverse().join('/'),
            Investimento: spend,
            Leads: leads,
            Cliques: clicks,
            Impressões: impressions,
            Alcance: reach,
            CPM: cpm,
            Frequência: freq,
            CTR: ctr,
            CPA: cpa
          };
        });
        
        setDailyData(timeline);
      } catch (err) {
        setError('Erro ao carregar dados diários: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadDaily();
  }, [accountId, token, dateRanges]);

  const handleDownloadPdf = () => {
    if (!reportRef.current) return;
    
    const opt = {
      margin:       [0, 0, 0, 0], // Remove a margem externa branca do PDF
      filename:     `Relatorio-Mensal-SaoLuiz-${new Date().toISOString().split('T')[0]}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2, useCORS: true, logging: false, backgroundColor: '#070908', windowWidth: 1200 }, // Força a cor preta no fundo
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'] } // Remove o avoid-all que causa grandes quebras na página
    };

    html2pdf().from(reportRef.current).set(opt).save();
  };

  if (!dataMonth) return null;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CalendarDays color="var(--neon-green)" /> Relatório Mensal Consolidado
        </h1>
        <button 
          onClick={handleDownloadPdf}
          style={{
            background: 'var(--neon-green)', color: 'var(--bg-dark)', border: 'none', borderRadius: '8px',
            padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold',
            cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none'
          }}
        >
          <Download size={18} /> Exportar Relatório (PDF)
        </button>
      </div>
      
      {/* Container que será impresso */}
      <div ref={reportRef} style={{ background: 'var(--bg-dark)', padding: '2rem', borderRadius: '16px', color: 'white' }}>
        <PresentationReport 
          currentData={dataMonth.current} 
          previousData={dataMonth.previous} 
          accountId={accountId} 
          label="Mês Atual" 
          dateRanges={{ current: { since: dateRanges?.current?.sinceMonth, until: dateRanges?.current?.untilMonth }, previous: { since: dateRanges?.previous?.sinceMonth, until: dateRanges?.previous?.untilMonth } }} 
          hideAlerts={true}
        />
        
        <div style={{ marginTop: '3rem', pageBreakInside: 'avoid' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <TrendingUp /> Evolução Diária das Métricas
          </h2>
          
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin" color="var(--neon-green)" size={32} /></div>
          ) : error ? (
            <div style={{ color: '#ff4444' }}>{error}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <MiniChart title="Impressões" data={dailyData} dataKey="Impressões" color="#3B82F6" format={formatNumber} />
              <MiniChart title="Alcance" data={dailyData} dataKey="Alcance" color="#8B5CF6" format={formatNumber} />
              <MiniChart title="CPM" data={dailyData} dataKey="CPM" color="#F59E0B" format={formatCurrency} />
              
              <MiniChart title="Frequência" data={dailyData} dataKey="Frequência" color="#10B981" format={formatDecimal} />
              <MiniChart title="CTR" data={dailyData} dataKey="CTR" color="#EC4899" format={formatPercent} />
              <MiniChart title="Cliques" data={dailyData} dataKey="Cliques" color="#06B6D4" format={formatNumber} />
              
              <MiniChart title="Contatos" data={dailyData} dataKey="Leads" color="var(--neon-green)" format={formatNumber} />
              <MiniChart title="Custo P/ Contato" data={dailyData} dataKey="CPA" color="#EF4444" format={formatCurrency} />
              <MiniChart title="Investimento" data={dailyData} dataKey="Investimento" color="#F97316" format={formatCurrency} />
            </div>
          )}
        </div>
        
        {dataMonth.current?.creatives && dataMonth.current.creatives.length > 0 && (
          <div style={{ marginTop: '3rem', pageBreakInside: 'avoid' }}>
            <h2 style={{ color: 'white', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
              Top Criativos do Mês
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {dataMonth.current.creatives.slice(0, 6).map((c, i) => {
                const imageUrl = c.creative?.image_url || c.creative?.thumbnail_url;
                if (!imageUrl) return null;
                return (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px' }}>
                    <img src={imageUrl} alt={c.name} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '4px', marginBottom: '10px' }} />
                    <p style={{ margin: 0, fontSize: '12px', color: '#aaaaaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.creative?.title || c.name || 'Sem título'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
