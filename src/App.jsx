import React, { useState, useEffect } from 'react';
import './App.css';
import './Tabs.css';
import TopStats from './components/TopStats';
import FunnelChart from './components/FunnelChart';
import ActiveCampaigns from './components/ActiveCampaigns';
import InsightsBoard from './components/InsightsBoard';
import EfficiencyRanking from './components/EfficiencyRanking';
import Settings from './components/Settings';
import CustomDateFilter from './components/CustomDateFilter';
import { fetchMetaAdsData, fetchCampaignsStatus, processApiData, generateDashboardData, generateSinglePeriodData } from './services/metaApi';
import { RefreshCw, BarChart2, Settings as SettingsIcon } from 'lucide-react';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [customData, setCustomData] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState('');
  
  const [accountId, setAccountId] = useState(localStorage.getItem('metaAccountId') || '');
  const [token, setToken] = useState(localStorage.getItem('metaToken') || '');

  const saveSettings = (id, tok) => {
    localStorage.setItem('metaAccountId', id);
    localStorage.setItem('metaToken', tok);
    setAccountId(id);
    setToken(tok);
  };

  const getDates = () => {
    const today = new Date();
    
    // For Month (Este Mês), we include today
    const untilMonth = today.toISOString().split('T')[0];
    const sinceMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    
    // For 7 Days (Últimos 7 dias), Facebook excludes today by default
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const until7Days = yesterday.toISOString().split('T')[0];
    
    const sevenDaysAgo = new Date(yesterday);
    sevenDaysAgo.setDate(yesterday.getDate() - 6); // 6 days before yesterday = 7 days total (e.g. 13 to 19)
    const since7Days = sevenDaysAgo.toISOString().split('T')[0];
    
    return { since7Days, until7Days, sinceMonth, untilMonth };
  };

  const loadData = async (forceApi = false, overrideId = null, overrideToken = null) => {
    try {
      setLoading(true);
      setErrorMsg('');
      
      const targetId = overrideId || accountId;
      const targetToken = overrideToken || token;

      // Try Meta API first if we have credentials
      if (targetId && targetToken) {
        try {
          const { since7Days, until7Days, sinceMonth, untilMonth } = getDates();
          
          console.log("Fetching from Meta API...");
          const [insights7Days, insightsMonth, campaignsStatus] = await Promise.all([
            fetchMetaAdsData(targetId, targetToken, since7Days, until7Days),
            fetchMetaAdsData(targetId, targetToken, sinceMonth, untilMonth),
            fetchCampaignsStatus(targetId, targetToken)
          ]);
          
          const processed7Days = processApiData(insights7Days, campaignsStatus);
          const processedMonth = processApiData(insightsMonth, campaignsStatus);
          const finalData = generateDashboardData(processed7Days, processedMonth);
          
          setData(finalData);
          setLoading(false);
          setActiveTab(0); // Go back to dashboard if sync successful
          return;
        } catch (apiError) {
          console.error("Erro API Meta:", apiError);
          setErrorMsg(apiError.message || "Erro na API do Meta. Verifique o Token e Conta.");
          if (forceApi) {
            setLoading(false);
            return;
          }
          // If auto-loading failed, we will fallback to CSV below
        }
      }

      if (!targetId || !targetToken) {
        throw new Error('Configure o Account ID e Token na aba Integração API.');
      }
      
    } catch (error) {
      console.error("Erro geral:", error);
      setErrorMsg("Nenhum dado encontrado. Configure a API do Meta ou certifique-se de que o CSV foi processado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSync = (id, tok) => {
    loadData(true, id, tok);
  };

  const loadCustomData = async (startDate, endDate) => {
    if (!accountId || !token) {
      setCustomError('Configure a Integração API primeiro.');
      return;
    }
    try {
      setCustomLoading(true);
      setCustomError('');
      const [insights, campaignsStatus] = await Promise.all([
        fetchMetaAdsData(accountId, token, startDate, endDate),
        fetchCampaignsStatus(accountId, token)
      ]);
      const processed = processApiData(insights, campaignsStatus);
      
      const partsStart = startDate.split('-');
      const partsEnd = endDate.split('-');
      const label = `${partsStart[2]}/${partsStart[1]} a ${partsEnd[2]}/${partsEnd[1]}`;
      
      const singleData = generateSinglePeriodData(processed, label);
      setCustomData({ ...singleData, processed });
    } catch (err) {
      setCustomError(err.message || 'Erro ao buscar período personalizado.');
    } finally {
      setCustomLoading(false);
    }
  };

  if (loading && !data) {
    return <div style={{ color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,255,136,0.2)', borderTopColor: 'var(--neon-green)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <div>{accountId && token ? 'Sincronizando com a Meta Ads API...' : 'Carregando dados...'}</div>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>;
  }

  return (
    <div className="app-container">
      <header className="section-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ textAlign: 'left' }}>
          <div className="section-subtitle">
            {accountId ? `CONTA ACT_${accountId} • REDE SÃO LUIZ` : 'REDE SÃO LUIZ'}
          </div>
          <div className="section-title">Dashboard Inteligente</div>
        </div>
        <button 
          onClick={() => loadData(!!token)}
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

      {errorMsg && activeTab !== 4 && activeTab !== 3 && (
        <div style={{ background: 'rgba(255, 50, 50, 0.1)', border: '1px solid rgba(255, 50, 50, 0.3)', padding: '1rem', borderRadius: '8px', color: '#ffaaaa', marginBottom: '1rem', textAlign: 'center' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Resumo Executivo */}
      {data && activeTab !== 4 && activeTab !== 3 && (
        <div style={{ background: 'rgba(0, 255, 136, 0.05)', border: '1px solid rgba(0, 255, 136, 0.2)', padding: '1.2rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ padding: '10px', background: 'rgba(0, 255, 136, 0.1)', borderRadius: '50%' }}>
            <BarChart2 color="var(--neon-green)" />
          </div>
          <div style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.5' }}>
            <strong style={{ color: 'var(--neon-green)' }}>Resumo Executivo:</strong> {data.summary}
          </div>
        </div>
      )}

      <div className="tabs-container">
        <button className={`tab-button ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>Últimos 7 Dias</button>
        <button className={`tab-button ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>Acumulado (Mês)</button>
        <button className={`tab-button ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>Campanhas Ativas & Insights</button>
        <button className={`tab-button ${activeTab === 3 ? 'active' : ''}`} onClick={() => setActiveTab(3)}>Período Personalizado</button>
        <button className={`tab-button ${activeTab === 4 ? 'active' : ''}`} onClick={() => setActiveTab(4)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SettingsIcon size={16} /> Integração API
        </button>
      </div>

      {!data && activeTab !== 4 && !loading && (
         <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
           Dados não encontrados. Vá para a aba "Integração API" para conectar com o Facebook Ads.
         </div>
      )}

      {data && activeTab === 0 && (
        <>
          <TopStats data={data.topStats} />
          <FunnelChart data={data.funnel} />
        </>
      )}

      {data && activeTab === 1 && (
        <>
          <TopStats data={data.topStatsAcc} />
          <div className="card accumulated-card" style={{ animationDelay: '0.3s' }}>
            <div className="accumulated-label">{data.accumulatedCard?.label || 'RESUMO GERAL'}</div>
            <div className="accumulated-data">
              <div><span className="highlight-green">💳 {data.accumulatedCard?.spent}</span></div>
              <div><span className="highlight-white">👥 {data.accumulatedCard?.leadsTotal}</span> {data.accumulatedCard?.leadsBreakdown}</div>
              <div><span className="highlight-yellow">🎯 {data.accumulatedCard?.cpl}</span></div>
              <div><span className="highlight-white">🔄 {data.accumulatedCard?.freq}</span></div>
            </div>
          </div>
          <FunnelChart data={data.funnelAcc} />
        </>
      )}

      {data && activeTab === 2 && (
        <>
          <InsightsBoard alerts={data.alerts} />
          <ActiveCampaigns campaigns={data.activeCampaigns} pausedCount={data.pausedZeroSpendCount || 0} />
          <EfficiencyRanking campaigns={data.activeCampaigns} />
        </>
      )}

      {activeTab === 3 && (
        <div>
          <CustomDateFilter onSearch={loadCustomData} isSearching={customLoading} />
          
          {customError && (
             <div style={{ background: 'rgba(255, 50, 50, 0.1)', border: '1px solid rgba(255, 50, 50, 0.3)', padding: '1rem', borderRadius: '8px', color: '#ffaaaa', marginBottom: '1rem', textAlign: 'center' }}>
              ⚠️ {customError}
            </div>
          )}

          {customData && (
            <>
              <TopStats data={customData.topStats} />
              <FunnelChart data={customData.funnel} />
            </>
          )}
          
          {!customData && !customLoading && !customError && (
             <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
               Selecione um período acima para consultar o Meta Ads.
             </div>
          )}
        </div>
      )}

      {activeTab === 4 && (
        <Settings 
          accountId={accountId} 
          token={token} 
          onSave={saveSettings} 
          onSync={handleManualSync}
          isSyncing={loading}
        />
      )}

    </div>
  );
}

export default App;
