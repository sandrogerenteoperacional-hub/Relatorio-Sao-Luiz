import React, { useState, useEffect, useRef } from 'react';
import { generateAiReport } from '../services/aiApi';
import { fetchMetaAdsData, fetchDailyInsights, fetchAdLevelInsights, fetchAdCreativesDetails, fetchCampaignsStatus, processApiData } from '../services/metaApi';
import { Bot, FileText, Calendar, Copy, Check, MessageSquare, AlertCircle, Download, Save, History } from 'lucide-react';
import html2pdf from 'html2pdf.js';

export const AiReportsTab = ({ accountId, token, geminiApiKey }) => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [topCreatives, setTopCreatives] = useState([]);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  
  const [savedReports, setSavedReports] = useState(() => {
    const localData = localStorage.getItem('aiSavedReports');
    return localData ? JSON.parse(localData) : [];
  });
  const [showHistory, setShowHistory] = useState(false);

  const reportRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('aiSavedReports', JSON.stringify(savedReports));
  }, [savedReports]);

  const formatDate = (date) => date.toISOString().split('T')[0];

  const getDates = (type) => {
    const today = new Date();
    
    if (type === 'segunda') {
      // Últimos 7 dias
      const end = new Date(today);
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      return { start: formatDate(start), end: formatDate(end) };
    } 
    else if (type === 'quarta') {
      // Mês atual até agora
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: formatDate(start), end: formatDate(today) };
    } 
    else if (type === 'sexta') {
      // Segunda a Sexta atual
      const dayOfWeek = today.getDay(); // 0 = Dom, 1 = Seg... 5 = Sex
      const diffToMonday = dayOfWeek >= 1 ? dayOfWeek - 1 : 6;
      const start = new Date(today);
      start.setDate(today.getDate() - diffToMonday);
      return { start: formatDate(start), end: formatDate(today) };
    }
  };

  const fetchBaseData = async (startDate, endDate) => {
    const campaignsStatus = await fetchCampaignsStatus(accountId, token);
    const raw = await fetchMetaAdsData(accountId, token, startDate, endDate);
    const processed = processApiData(raw, campaignsStatus);
    
    const adInsights = await fetchAdLevelInsights(accountId, token, startDate, endDate);
    const topAds = adInsights.sort((a, b) => (b.spend || 0) - (a.spend || 0)).slice(0, 10);
    const adIds = topAds.map(ad => ad.ad_id);
    let creatives = [];
    if (adIds.length > 0) {
      creatives = await fetchAdCreativesDetails(accountId, token, adIds);
    }
    
    // Mapear gastos por campanha para análise setorial
    const campaignSummary = raw.map(c => ({
      nome: c.campaign_name,
      gasto: parseFloat(c.spend || 0),
      impressoes: parseInt(c.impressions || 0),
      conversas: c.actions ? c.actions.find(a => a.action_type === 'messaging_conversation_started_7d')?.value || 0 : 0
    }));

    return { processed, creatives, campaignSummary };
  };

  const formatDataForPrompt = (data) => {
    const p = data.processed;
    const formatBRL = (v) => `R$ ${parseFloat(v).toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
    
    let text = `
    === RESUMO DA PERFORMANCE ===
    Investimento Total: ${formatBRL(p.sales)}
    Alcance Total: ${p.reach}
    Impressões: ${p.impressions}
    Conversas Iniciadas (Leads): ${p.leads}
    Custo por Conversa (CPA): ${formatBRL(p.cpa)}
    CTR Médio: ${p.ctr}%
    `;

    text += `\n\n=== CAMPANHAS (SETORES) ===\n`;
    data.campaignSummary.forEach(c => {
      text += `- ${c.nome}: Gasto ${formatBRL(c.gasto)} | Conversas: ${c.conversas}\n`;
    });

    text += `\n\n=== PRINCIPAIS CRIATIVOS ATIVOS ===\n`;
    data.creatives.forEach((c, i) => {
      const creativeData = c.creative || {};
      const title = creativeData.title || c.name || 'Sem título';
      const body = creativeData.body || '';
      text += `${i+1}. Título: "${title}" | Corpo: "${body.substring(0, 50)}..."\n`;
    });

    return text;
  };

  const handleGenerate = async (type) => {
    if (!geminiApiKey) {
      setError('Por favor, configure sua Chave de API do Gemini na aba "Integração API".');
      return;
    }
    if (!accountId || !token) {
      setError('Por favor, configure sua Conta do Meta Ads na aba "Integração API".');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setReportType(type);
      setGeneratedText('');
      setTopCreatives([]);
      
      const { start, end } = getDates(type);
      const data = await fetchBaseData(start, end);
      const dataStr = formatDataForPrompt(data);

      setTopCreatives(data.creatives);

      let prompt = `Você é um Especialista Sênior de Marketing Digital focado em Performance para Supermercados.
      Aqui estão os dados reais extraídos do Meta Ads no período de ${start} a ${end}:
      ${dataStr}
      
      `;

      if (type === 'segunda') {
        prompt += `Hoje é SEGUNDA-FEIRA. Sua tarefa é escrever um relatório via mensagem de WhatsApp para o "Alê" (Coordenador) sobre a performance da semana anterior.
        A mensagem deve conter:
        1. Saudação animada para começar a semana.
        2. QUAIS SÃO OS CRIATIVOS QUE ESTÃO ATIVOS (cite os principais da lista).
        3. Um resumo executivo de Alcance, Conversas Iniciadas e Custo Médio (CPA).
        4. Seja direto, use emojis e linguagem de WhatsApp profissional, sem exagerar. Não crie dados falsos, use apenas os números fornecidos.`;
      } 
      else if (type === 'quarta') {
        prompt += `Hoje é QUARTA-FEIRA. Sua tarefa é escrever uma mensagem de WhatsApp para o "Alê" com um "Feedback de Meio de Semana" e alinhamento de metas mensais.
        A mensagem deve conter:
        1. Saudação de meio de semana.
        2. Um feedback geral sobre como está o andamento da meta mensal (analisando o volume e custo).
        3. Analise as campanhas/setores (Horti, Limpeza, Açougue, etc baseando-se nos nomes das campanhas) para sugerir onde focar e gerar mais fluxo para atrair clientes neste final de semana.
        4. Use emojis, linguagem profissional e dinâmica.`;
      }
      else if (type === 'sexta') {
        prompt += `Hoje é SEXTA-FEIRA. Sua tarefa é escrever uma mensagem de WhatsApp para o "Alê" resumindo a semana.
        A mensagem deve conter:
        1. Saudação de fim de semana chegando.
        2. Um resumo geral da semana (principais números).
        3. Alinhamento sobre OPORTUNIDADES estratégicas que podemos explorar na PRÓXIMA semana baseando-se no que funcionou ou não.
        4. Fechamento animado. Use emojis apropriados.`;
      }

      const generated = await generateAiReport(geminiApiKey, prompt);
      setGeneratedText(generated);
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro ao gerar o relatório.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveReport = () => {
    if (!generatedText) return;
    
    const newReport = {
      id: Date.now().toString(),
      date: new Date().toLocaleString('pt-BR'),
      type: reportType,
      text: generatedText,
      creatives: topCreatives
    };
    
    setSavedReports(prev => [newReport, ...prev]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDownloadPdf = () => {
    if (!reportRef.current) return;
    
    const opt = {
      margin:       10,
      filename:     `Relatorio-IA-${reportType}-${formatDate(new Date())}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(reportRef.current).save();
  };

  const loadHistoryItem = (item) => {
    setReportType(item.type);
    setGeneratedText(item.text);
    setTopCreatives(item.creatives || []);
    setShowHistory(false);
  };

  const deleteHistoryItem = (id) => {
    setSavedReports(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--neon-green)', padding: '12px', borderRadius: '12px', color: 'var(--bg-dark)' }}>
            <Bot size={28} />
          </div>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text-main)' }}>Assistente I.A.</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>Gere relatórios textuais automáticos para o Alê (WhatsApp)</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowHistory(!showHistory)}
          style={{
            background: showHistory ? 'var(--neon-green)' : 'rgba(255,255,255,0.05)',
            color: showHistory ? 'var(--bg-dark)' : 'white',
            border: showHistory ? '1px solid var(--neon-green)' : '1px solid rgba(255,255,255,0.2)',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: showHistory ? 'bold' : 'normal',
            transition: 'all 0.2s'
          }}
        >
          <History size={18} />
          Histórico de Relatórios
        </button>
      </div>

      {showHistory && (
        <div className="card" style={{ marginBottom: '2rem', animation: 'fadeInDown 0.3s ease' }}>
          <h3 style={{ margin: 0, marginBottom: '1rem', color: 'var(--text-main)' }}>Meus Relatórios Salvos</h3>
          {savedReports.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Nenhum relatório salvo no histórico ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {savedReports.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <strong style={{ color: 'var(--neon-green)', textTransform: 'capitalize' }}>{item.type}</strong>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '12px', fontSize: '0.9rem' }}>Salvo em: {item.date}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => loadHistoryItem(item)}
                      style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Abrir
                    </button>
                    <button 
                      onClick={() => deleteHistoryItem(item.id)}
                      style={{ background: 'rgba(255,50,50,0.1)', color: '#ffaaaa', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(255, 50, 50, 0.1)', border: '1px solid rgba(255, 50, 50, 0.3)', padding: '1rem', borderRadius: '8px', color: '#ffaaaa', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {/* Segunda */}
        <button 
          onClick={() => handleGenerate('segunda')}
          disabled={loading}
          style={{
            background: reportType === 'segunda' ? 'rgba(0, 255, 128, 0.1)' : 'rgba(255,255,255,0.05)',
            border: reportType === 'segunda' ? '1px solid var(--neon-green)' : '1px solid rgba(255,255,255,0.1)',
            padding: '1.5rem',
            borderRadius: '12px',
            textAlign: 'left',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            opacity: loading && reportType !== 'segunda' ? 0.5 : 1
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: reportType === 'segunda' ? 'var(--neon-green)' : 'var(--text-main)', marginBottom: '0.5rem' }}>
            <Calendar size={20} />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Relatório de Segunda</h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Performance da semana anterior, criativos ativos e insights.</p>
        </button>

        {/* Quarta */}
        <button 
          onClick={() => handleGenerate('quarta')}
          disabled={loading}
          style={{
            background: reportType === 'quarta' ? 'rgba(0, 255, 128, 0.1)' : 'rgba(255,255,255,0.05)',
            border: reportType === 'quarta' ? '1px solid var(--neon-green)' : '1px solid rgba(255,255,255,0.1)',
            padding: '1.5rem',
            borderRadius: '12px',
            textAlign: 'left',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            opacity: loading && reportType !== 'quarta' ? 0.5 : 1
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: reportType === 'quarta' ? 'var(--neon-green)' : 'var(--text-main)', marginBottom: '0.5rem' }}>
            <MessageSquare size={20} />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Relatório de Quarta</h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Feedback com metas do mês e foco de fluxo para os setores.</p>
        </button>

        {/* Sexta */}
        <button 
          onClick={() => handleGenerate('sexta')}
          disabled={loading}
          style={{
            background: reportType === 'sexta' ? 'rgba(0, 255, 128, 0.1)' : 'rgba(255,255,255,0.05)',
            border: reportType === 'sexta' ? '1px solid var(--neon-green)' : '1px solid rgba(255,255,255,0.1)',
            padding: '1.5rem',
            borderRadius: '12px',
            textAlign: 'left',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            opacity: loading && reportType !== 'sexta' ? 0.5 : 1
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: reportType === 'sexta' ? 'var(--neon-green)' : 'var(--text-main)', marginBottom: '0.5rem' }}>
            <FileText size={20} />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Relatório de Sexta</h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Resumo geral e alinhamento de oportunidades para a próxima semana.</p>
        </button>
      </div>

      {loading && (
         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 0' }}>
           <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,255,136,0.2)', borderTopColor: 'var(--neon-green)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
           <div style={{ color: 'var(--neon-green)' }}>A Inteligência Artificial está analisando os dados e escrevendo...</div>
         </div>
      )}

      {!loading && generatedText && (
        <div className="card" style={{ animation: 'fadeInUp 0.4s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Texto Gerado (Editável)</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                onClick={handleSaveReport}
                style={{
                  background: saved ? 'rgba(0, 255, 128, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  color: saved ? 'var(--neon-green)' : 'white',
                  border: saved ? '1px solid var(--neon-green)' : '1px solid rgba(255,255,255,0.2)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                {saved ? <Check size={18} /> : <Save size={18} />}
                {saved ? 'Salvo!' : 'Salvar no Histórico'}
              </button>
              
              <button 
                onClick={handleDownloadPdf}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <Download size={18} />
                Baixar PDF
              </button>

              <button 
                onClick={handleCopy}
                style={{
                  background: copied ? 'rgba(0, 255, 128, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  color: copied ? 'var(--neon-green)' : 'white',
                  border: copied ? '1px solid var(--neon-green)' : '1px solid rgba(255,255,255,0.2)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copiado!' : 'Copiar para WhatsApp'}
              </button>
            </div>
          </div>
          
          <div ref={reportRef} style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px' }}>
            <textarea 
              value={generatedText}
              onChange={(e) => setGeneratedText(e.target.value)}
              style={{
                width: '100%',
                minHeight: '350px',
                padding: '1.5rem',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '1rem',
                lineHeight: '1.6',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '2rem'
              }}
            />

            {topCreatives && topCreatives.length > 0 && (
              <div>
                <h4 style={{ color: 'var(--text-main)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  Criativos Mencionados (Para Baixar/Anexar)
                </h4>
                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                  {topCreatives.slice(0, 6).map((c, i) => {
                    const imageUrl = c.creative?.image_url || c.creative?.thumbnail_url;
                    if (!imageUrl) return null;
                    
                    return (
                      <div key={i} style={{ 
                        minWidth: '150px', 
                        maxWidth: '150px', 
                        background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <div style={{ 
                          width: '100%', 
                          height: '150px', 
                          backgroundImage: `url(${imageUrl})`, 
                          backgroundSize: 'cover', 
                          backgroundPosition: 'center' 
                        }} />
                        <div style={{ padding: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.creative?.title || c.name || 'Sem título'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
