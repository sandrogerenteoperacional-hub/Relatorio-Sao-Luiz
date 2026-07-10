import React, { useState, useEffect } from 'react';
import './App.css';
import './Tabs.css';
import TopStats from './components/TopStats';
import FunnelChart from './components/FunnelChart';
import ActiveCampaigns from './components/ActiveCampaigns';
import InsightsBoard from './components/InsightsBoard';
import EfficiencyRanking from './components/EfficiencyRanking';
import { RefreshCw, BarChart2 } from 'lucide-react';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/data.json?t=${new Date().getTime()}`);
      if (!response.ok) throw new Error('Falha ao carregar dados');
      const jsonData = await response.json();
      setData(jsonData);
    } catch (error) {
      console.error("Erro ao ler data.json:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) {
    return <div style={{ color: 'white' }}>Processando planilhas e carregando dados...</div>;
  }

  if (!data) {
    return <div style={{ color: 'white' }}>Erro ao carregar os dados. Verifique se os arquivos CSV estão na pasta e o script rodou corretamente.</div>;
  }

  return (
    <div className="app-container">
      <header className="section-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ textAlign: 'left' }}>
          <div className="section-subtitle">CONTA ACT_1276750357909016 • REDE SÃO LUIZ</div>
          <div className="section-title">Dashboard Inteligente</div>
        </div>
        <button 
          onClick={loadData}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
            fontWeight: '600'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          <RefreshCw size={18} /> Recarregar Dados
        </button>
      </header>

      {/* Resumo Executivo */}
      <div style={{ background: 'rgba(0, 255, 136, 0.05)', border: '1px solid rgba(0, 255, 136, 0.2)', padding: '1.2rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ padding: '10px', background: 'rgba(0, 255, 136, 0.1)', borderRadius: '50%' }}>
          <BarChart2 color="var(--neon-green)" />
        </div>
        <div style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.5' }}>
          <strong style={{ color: 'var(--neon-green)' }}>Resumo Executivo:</strong> {data.summary}
        </div>
      </div>

      <div className="tabs-container">
        <button className={`tab-button ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>Últimos 7 Dias</button>
        <button className={`tab-button ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>Acumulado (Mês)</button>
        <button className={`tab-button ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>Campanhas Ativas & Insights</button>
      </div>

      {activeTab === 0 && (
        <>
          <TopStats data={data.topStats} />
          <FunnelChart data={data.funnel} />
        </>
      )}

      {activeTab === 1 && (
        <>
          <TopStats data={data.topStatsAcc} />
          <div className="card accumulated-card" style={{ animationDelay: '0.3s' }}>
            <div className="accumulated-label">{data.accumulatedCard.label}</div>
            <div className="accumulated-data">
              <div><span className="highlight-green">💳 {data.accumulatedCard.spent}</span></div>
              <div><span className="highlight-white">👥 {data.accumulatedCard.leadsTotal}</span> {data.accumulatedCard.leadsBreakdown}</div>
              <div><span className="highlight-yellow">🎯 {data.accumulatedCard.cpl}</span></div>
              <div><span className="highlight-white">🔄 {data.accumulatedCard.freq}</span></div>
            </div>
          </div>
          <FunnelChart data={data.funnelAcc} />
        </>
      )}

      {activeTab === 2 && (
        <>
          <InsightsBoard alerts={data.alerts} />
          <ActiveCampaigns campaigns={data.activeCampaigns} pausedCount={data.pausedZeroSpendCount} />
          <EfficiencyRanking campaigns={data.activeCampaigns} />
        </>
      )}


    </div>
  );
}

export default App;
