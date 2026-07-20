import React, { useState, useEffect } from 'react';
import './App.css';
import './Tabs.css';
import Settings from './components/Settings';
import CustomDateFilter from './components/CustomDateFilter';
import { PresentationReport } from './components/report/PresentationReport';
import { fetchMetaAdsData, fetchCampaignsStatus, processApiData } from './services/metaApi';
import { RefreshCw, Settings as SettingsIcon } from 'lucide-react';

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
    
    // Este Mês
    const untilMonth = today.toISOString().split('T')[0];
    const sinceMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    
    // Este Mês Anterior (Mês Passado equivalente aos dias passados do mês atual)
    const prevMonthSince = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
    const prevMonthUntil = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()).toISOString().split('T')[0];

    // Últimos 7 dias
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const until7Days = yesterday.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(yesterday);
    sevenDaysAgo.setDate(yesterday.getDate() - 6);
    const since7Days = sevenDaysAgo.toISOString().split('T')[0];

    // Anteriores 7 dias
    const prev7Until = new Date(sevenDaysAgo);
    prev7Until.setDate(sevenDaysAgo.getDate() - 1);
    const prev7Since = new Date(prev7Until);
    prev7Since.setDate(prev7Until.getDate() - 6);

    // Últimos 30 dias
    const thirtyDaysAgo = new Date(yesterday);
    thirtyDaysAgo.setDate(yesterday.getDate() - 29);
    const since30Days = thirtyDaysAgo.toISOString().split('T')[0];

    // Anteriores 30 dias
    const prev30Until = new Date(thirtyDaysAgo);
    prev30Until.setDate(thirtyDaysAgo.getDate() - 1);
    const prev30Since = new Date(prev30Until);
    prev30Since.setDate(prev30Until.getDate() - 29);

    // Mês Passado Completo
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    const sinceLastMonth = firstDayLastMonth.toISOString().split('T')[0];
    const untilLastMonth = lastDayLastMonth.toISOString().split('T')[0];

    // Mês Retrasado Completo (Para comparação do mês passado)
    const firstDayPrevLastMonth = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const lastDayPrevLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 0);

    return { 
      current: {
        since7Days, until7Days, 
        since30Days, until30Days: until7Days, 
        sinceMonth, untilMonth, 
        sinceLastMonth, untilLastMonth
      },
      previous: {
        since7Days: prev7Since.toISOString().split('T')[0], until7Days: prev7Until.toISOString().split('T')[0],
        since30Days: prev30Since.toISOString().split('T')[0], until30Days: prev30Until.toISOString().split('T')[0],
        sinceMonth: prevMonthSince, untilMonth: prevMonthUntil,
        sinceLastMonth: firstDayPrevLastMonth.toISOString().split('T')[0], untilLastMonth: lastDayPrevLastMonth.toISOString().split('T')[0]
      }
    };
  };

  const loadData = async (forceApi = false, overrideId = null, overrideToken = null) => {
    try {
      setLoading(true);
      setErrorMsg('');
      
      const targetId = overrideId || accountId;
      const targetToken = overrideToken || token;

      if (targetId && targetToken) {
        try {
          const dates = getDates();
          const { current: c, previous: p } = dates;
          
          console.log("Fetching current and previous periods from Meta API...");
          
          // Precisamos do status das campanhas primeiro para cruzar depois
          const campaignsStatus = await fetchCampaignsStatus(targetId, targetToken);

          // Buscar tudo paralelamente para ser rápido
          const results = await Promise.all([
            fetchMetaAdsData(targetId, targetToken, c.since7Days, c.until7Days),
            fetchMetaAdsData(targetId, targetToken, c.since30Days, c.until30Days),
            fetchMetaAdsData(targetId, targetToken, c.sinceMonth, c.untilMonth),
            fetchMetaAdsData(targetId, targetToken, c.sinceLastMonth, c.untilLastMonth),
            
            fetchMetaAdsData(targetId, targetToken, p.since7Days, p.until7Days),
            fetchMetaAdsData(targetId, targetToken, p.since30Days, p.until30Days),
            fetchMetaAdsData(targetId, targetToken, p.sinceMonth, p.untilMonth),
            fetchMetaAdsData(targetId, targetToken, p.sinceLastMonth, p.untilLastMonth)
          ]);
          
          const process = (raw) => processApiData(raw, campaignsStatus);

          const finalData = {
            data7Days: { current: process(results[0]), previous: process(results[4]) },
            data30Days: { current: process(results[1]), previous: process(results[5]) },
            dataMonth: { current: process(results[2]), previous: process(results[6]) },
            dataLastMonth: { current: process(results[3]), previous: process(results[7]) }
          };
          
          setData(finalData);
          setLoading(false);
          setActiveTab(0);
          return;
        } catch (apiError) {
          console.error("Erro API Meta:", apiError);
          setErrorMsg(apiError.message || "Erro na API do Meta. Verifique o Token e Conta.");
          if (forceApi) {
            setLoading(false);
            return;
          }
        }
      }

      if (!targetId || !targetToken) {
        throw new Error('Configure o Account ID e Token na aba Integração API.');
      }
      
    } catch (error) {
      console.error("Erro geral:", error);
      setErrorMsg(error.message || "Erro desconhecido.");
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
      
      const campaignsStatus = await fetchCampaignsStatus(accountId, token);
      const raw = await fetchMetaAdsData(accountId, token, startDate, endDate);
      const processed = processApiData(raw, campaignsStatus);
      
      setCustomData({ current: processed, previous: null });
    } catch (err) {
      setCustomError(err.message || 'Erro ao buscar período personalizado.');
    } finally {
      setCustomLoading(false);
    }
  };

  if (loading && !data) {
    return <div style={{ color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,255,136,0.2)', borderTopColor: 'var(--neon-green)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <div>{accountId && token ? 'Construindo Apresentação Executiva...' : 'Carregando...'}</div>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>;
  }

  return (
    <div className="app-container">
      <header className="section-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
          <RefreshCw size={18} /> Recarregar API
        </button>
      </header>

      {errorMsg && activeTab !== 6 && activeTab !== 5 && (
        <div style={{ background: 'rgba(255, 50, 50, 0.1)', border: '1px solid rgba(255, 50, 50, 0.3)', padding: '1rem', borderRadius: '8px', color: '#ffaaaa', marginBottom: '1rem', textAlign: 'center' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="tabs-container">
        <button className={`tab-button ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>7 Dias</button>
        <button className={`tab-button ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>30 Dias</button>
        <button className={`tab-button ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>Este Mês</button>
        <button className={`tab-button ${activeTab === 3 ? 'active' : ''}`} onClick={() => setActiveTab(3)}>Mês Passado</button>
        <button className={`tab-button ${activeTab === 4 ? 'active' : ''}`} onClick={() => setActiveTab(4)} style={{display: 'none'}}>Campanhas</button>
        <button className={`tab-button ${activeTab === 5 ? 'active' : ''}`} onClick={() => setActiveTab(5)}>Personalizado</button>
        <button className={`tab-button ${activeTab === 6 ? 'active' : ''}`} onClick={() => setActiveTab(6)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SettingsIcon size={16} /> Integração API
        </button>
      </div>

      {!data && activeTab !== 6 && !loading && (
         <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
           Dados não encontrados. Vá para a aba "Integração API" para conectar com o Facebook Ads.
         </div>
      )}

      {data && activeTab === 0 && <PresentationReport accountId={accountId} label="Últimos 7 Dias" currentData={data.data7Days.current} previousData={data.data7Days.previous} />}
      {data && activeTab === 1 && <PresentationReport accountId={accountId} label="Últimos 30 Dias" currentData={data.data30Days.current} previousData={data.data30Days.previous} />}
      {data && activeTab === 2 && <PresentationReport accountId={accountId} label="Este Mês (Atual)" currentData={data.dataMonth.current} previousData={data.dataMonth.previous} />}
      {data && activeTab === 3 && <PresentationReport accountId={accountId} label="Mês Passado Completo" currentData={data.dataLastMonth.current} previousData={data.dataLastMonth.previous} />}

      {activeTab === 5 && (
        <div>
          <CustomDateFilter onSearch={loadCustomData} isSearching={customLoading} />
          {customError && (
             <div style={{ background: 'rgba(255, 50, 50, 0.1)', border: '1px solid rgba(255, 50, 50, 0.3)', padding: '1rem', borderRadius: '8px', color: '#ffaaaa', marginBottom: '1rem', textAlign: 'center' }}>
              ⚠️ {customError}
            </div>
          )}
          {customData && <PresentationReport accountId={accountId} label="Período Personalizado" currentData={customData.current} previousData={null} />}
          {!customData && !customLoading && !customError && (
             <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
               Selecione um período acima para consultar o Meta Ads.
             </div>
          )}
        </div>
      )}

      {activeTab === 6 && (
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
