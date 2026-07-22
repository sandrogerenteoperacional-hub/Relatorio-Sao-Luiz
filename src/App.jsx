import React, { useState, useEffect } from 'react';
import './App.css';
import './Tabs.css';
import Settings from './components/Settings';
import CustomDateFilter from './components/CustomDateFilter';
import { MonthlyReportTab } from './components/MonthlyReportTab';
import { PresentationReport } from './components/report/PresentationReport';
import { CreativesTab } from './components/CreativesTab';
import { ChartsTab } from './components/ChartsTab';
import { AiReportsTab } from './components/AiReportsTab';
import { fetchMetaAdsData, fetchCampaignsStatus, processApiData, fetchAdLevelInsights, fetchAdCreativesDetails } from './services/metaApi';
import { RefreshCw, Settings as SettingsIcon, Image, BarChart3, Calendar, Bot, CalendarDays } from 'lucide-react';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [reportDates, setReportDates] = useState(null);
  
  const [customData, setCustomData] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState('');
  
  // Tenta pegar do localStorage primeiro, se não tiver, pega da variável de ambiente (Vercel)
  const [accountId, setAccountId] = useState(localStorage.getItem('metaAccountId') || import.meta.env.VITE_META_ACCOUNT_ID || '');
  const [token, setToken] = useState(localStorage.getItem('metaToken') || import.meta.env.VITE_META_TOKEN || '');
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('geminiApiKey') || import.meta.env.VITE_GEMINI_API_KEY || '');

  const saveSettings = (id, tok, gemini) => {
    localStorage.setItem('metaAccountId', id);
    localStorage.setItem('metaToken', tok);
    if (gemini) localStorage.setItem('geminiApiKey', gemini);
    setAccountId(id);
    setToken(tok);
    if (gemini) setGeminiApiKey(gemini);
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
          setReportDates(dates);
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

          const loadCreativesForPeriod = async (since, until) => {
            const adInsights = await fetchAdLevelInsights(targetId, targetToken, since, until);
            const topAds = adInsights.sort((a, b) => (b.spend || 0) - (a.spend || 0)).slice(0, 12);
            const adIds = topAds.map(ad => ad.ad_id);
            if (adIds.length > 0) {
              return await fetchAdCreativesDetails(targetId, targetToken, adIds);
            }
            return [];
          };

          const creativesProms = await Promise.all([
            loadCreativesForPeriod(c.since7Days, c.until7Days),
            loadCreativesForPeriod(c.since30Days, c.until30Days),
            loadCreativesForPeriod(c.sinceMonth, c.untilMonth),
            loadCreativesForPeriod(c.sinceLastMonth, c.untilLastMonth)
          ]);

          const finalData = {
            data7Days: { current: { ...process(results[0]), creatives: creativesProms[0] }, previous: process(results[4]) },
            data30Days: { current: { ...process(results[1]), creatives: creativesProms[1] }, previous: process(results[5]) },
            dataMonth: { current: { ...process(results[2]), creatives: creativesProms[2] }, previous: process(results[6]) },
            dataLastMonth: { current: { ...process(results[3]), creatives: creativesProms[3] }, previous: process(results[7]) }
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
      
      const adInsights = await fetchAdLevelInsights(accountId, token, startDate, endDate);
      const topAds = adInsights.sort((a, b) => (b.spend || 0) - (a.spend || 0)).slice(0, 12);
      const adIds = topAds.map(ad => ad.ad_id);
      let creatives = [];
      if (adIds.length > 0) {
        creatives = await fetchAdCreativesDetails(accountId, token, adIds);
      }
      
      setCustomData({ current: { ...processed, creatives }, previous: null });
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

      {errorMsg && activeTab !== 7 && activeTab !== 5 && (
        <div style={{ background: 'rgba(255, 50, 50, 0.1)', border: '1px solid rgba(255, 50, 50, 0.3)', padding: '1rem', borderRadius: '8px', color: '#ffaaaa', marginBottom: '1rem', textAlign: 'center' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="tabs-container">
        <button className={`tab-button ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>7 Dias</button>
        <button className={`tab-button ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>30 Dias</button>
        <button className={`tab-button ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>Este Mês</button>
        <button className={`tab-button ${activeTab === 3 ? 'active' : ''}`} onClick={() => setActiveTab(3)}>Mês Passado</button>
        <button className={`tab-button ${activeTab === 4 ? 'active' : ''}`} onClick={() => setActiveTab(4)}><Image size={18} /> Criativos</button>
        <button className={`tab-button ${activeTab === 6 ? 'active' : ''}`} onClick={() => setActiveTab(6)}><BarChart3 size={18} /> Gráficos & Funis</button>
        <button className={`tab-button ${activeTab === 9 ? 'active' : ''}`} onClick={() => setActiveTab(9)}><CalendarDays size={18} /> Relatório Mensal</button>
        <button className={`tab-button ${activeTab === 5 ? 'active' : ''}`} onClick={() => setActiveTab(5)}><Calendar size={18} /> Personalizado</button>
        <button className={`tab-button ${activeTab === 8 ? 'active' : ''}`} onClick={() => setActiveTab(8)} style={{ color: activeTab === 8 ? 'inherit' : 'var(--neon-green)' }}><Bot size={18} /> Assistente I.A.</button>
        <button className={`tab-button ${activeTab === 7 ? 'active' : ''}`} onClick={() => setActiveTab(7)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SettingsIcon size={16} /> Integração API
        </button>
        <button 
          onClick={() => loadData(!!token)}
          className="tab-button"
          style={{ 
            marginLeft: 'auto', 
            border: '1px solid rgba(255,255,255,0.2)',
            color: loading ? 'white' : 'var(--text-muted)',
            fontWeight: loading ? 'bold' : '600'
          }}
          title="Buscar dados mais recentes da Meta"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> {loading ? "Sincronizando..." : "Recarregar API"}
        </button>
      </div>

      {!data && activeTab !== 7 && !loading && (
         <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
           Dados não encontrados. Vá para a aba "Integração API" para conectar com o Facebook Ads.
         </div>
      )}

      {data && activeTab === 0 && <PresentationReport accountId={accountId} label="Últimos 7 Dias" currentData={data.data7Days.current} previousData={data.data7Days.previous} dateRanges={{ current: { since: reportDates?.current.since7Days, until: reportDates?.current.until7Days }, previous: { since: reportDates?.previous.since7Days, until: reportDates?.previous.until7Days } }} />}
      {data && activeTab === 1 && <PresentationReport accountId={accountId} label="Últimos 30 Dias" currentData={data.data30Days.current} previousData={data.data30Days.previous} dateRanges={{ current: { since: reportDates?.current.since30Days, until: reportDates?.current.until30Days }, previous: { since: reportDates?.previous.since30Days, until: reportDates?.previous.until30Days } }} />}
      {data && activeTab === 2 && <PresentationReport accountId={accountId} label="Este Mês (Atual)" currentData={data.dataMonth.current} previousData={data.dataMonth.previous} dateRanges={{ current: { since: reportDates?.current.sinceMonth, until: reportDates?.current.untilMonth }, previous: { since: reportDates?.previous.sinceMonth, until: reportDates?.previous.untilMonth } }} />}
      {data && activeTab === 3 && <PresentationReport accountId={accountId} label="Mês Passado Completo" currentData={data.dataLastMonth.current} previousData={data.dataLastMonth.previous} dateRanges={{ current: { since: reportDates?.current.sinceLastMonth, until: reportDates?.current.untilLastMonth }, previous: { since: reportDates?.previous.sinceLastMonth, until: reportDates?.previous.untilLastMonth } }} />}
      
      {data && (
        <>
          <div style={{ display: activeTab === 4 ? 'block' : 'none' }}>
            <CreativesTab accountId={accountId} token={token} creatives={data?.data7Days?.current?.creatives || []} />
          </div>
          {activeTab === 9 && <MonthlyReportTab accountId={accountId} token={token} dataMonth={data?.dataMonth} dateRanges={reportDates} />}
          <div style={{ display: activeTab === 6 ? 'block' : 'none' }}>
            <ChartsTab accountId={accountId} token={token} />
          </div>
        </>
      )}
      
      {activeTab === 8 && <AiReportsTab accountId={accountId} token={token} geminiApiKey={geminiApiKey} />}

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

      {activeTab === 7 && (
        <Settings 
          accountId={accountId} 
          token={token} 
          geminiApiKey={geminiApiKey}
          onSave={saveSettings} 
          onSync={handleManualSync}
          isSyncing={loading}
        />
      )}

    </div>
  );
}

export default App;
