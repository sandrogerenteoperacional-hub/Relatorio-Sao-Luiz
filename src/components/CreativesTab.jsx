import React, { useState } from 'react';
import { Search, Filter, SortDesc, SortAsc, RefreshCw } from 'lucide-react';
import { CreativesGallery } from './CreativesGallery';
import CustomDateFilter from './CustomDateFilter';
import { fetchAdLevelInsights, fetchAdCreativesDetails, getObjectiveGroup, extractFunnelAndResults } from '../services/metaApi';

export const CreativesTab = ({ accountId, token }) => {
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); 
  const [sortBy, setSortBy] = useState('SPEND_DESC');

  const handleSearchDates = async (startDate, endDate) => {
    if (!accountId || !token) {
      setError('Conta não configurada.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const adInsights = await fetchAdLevelInsights(accountId, token, startDate, endDate);
      
      const topAds = adInsights.sort((a, b) => (b.spend || 0) - (a.spend || 0)).slice(0, 50);
      const adIds = topAds.map(ad => ad.ad_id);
      
      if (adIds.length > 0) {
        const details = await fetchAdCreativesDetails(accountId, token, adIds);
        
        // Mesclar insights com detalhes criativos e calcular métricas
        const merged = topAds.map(ad => {
          const detail = details.find(d => d.id === ad.ad_id);
          
          // Calcular as métricas usando o extrator do dashboard
          const group = getObjectiveGroup(ad.objective, ad.campaign_name);
          const clicks = parseInt(ad.clicks || 0, 10);
          const impressions = parseInt(ad.impressions || 0, 10);
          const spend = parseFloat(ad.spend || 0);
          const reach = parseInt(ad.reach || 0, 10);
          
          const metrics = extractFunnelAndResults(group, ad, clicks, impressions, reach, spend);
          
          // Extrair ROAS
          let roas = 0;
          if (ad.purchase_roas && ad.purchase_roas.length > 0) {
            roas = parseFloat(ad.purchase_roas[0].value || 0);
          }

          const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

          return {
            ...ad,
            status: detail?.status || ad.status,
            creative: detail?.creative || null,
            calculatedMetrics: {
              ...metrics,
              roas,
              ctr,
              spend,
              clicks
            }
          };
        }).filter(ad => ad.creative && (ad.creative.thumbnail_url || ad.creative.image_url));
        
        setCreatives(merged);
      } else {
        setCreatives([]);
      }
    } catch (err) {
      setError('Erro ao buscar criativos da Meta API: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCreatives = creatives
    .filter(ad => {
      if (statusFilter === 'ACTIVE' && ad.status !== 'ACTIVE') return false;
      if (statusFilter === 'INACTIVE' && ad.status === 'ACTIVE') return false;
      if (searchTerm && !ad.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const m1 = a.calculatedMetrics;
      const m2 = b.calculatedMetrics;
      
      if (sortBy === 'SPEND_DESC') return m2.spend - m1.spend;
      if (sortBy === 'CPL_ASC') {
         // Coloca quem tem cpa 0 no final se for ordenar por menor CPL
         const cpa1 = m1.cpa > 0 ? m1.cpa : 999999;
         const cpa2 = m2.cpa > 0 ? m2.cpa : 999999;
         return cpa1 - cpa2;
      }
      if (sortBy === 'ROAS_DESC') return m2.roas - m1.roas;
      if (sortBy === 'CTR_DESC') return m2.ctr - m1.ctr;
      if (sortBy === 'CLICKS_DESC') return m2.clicks - m1.clicks;
      if (sortBy === 'RESULTS_DESC') return m2.result - m1.result;
      
      return 0;
    });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'white', margin: 0 }}>Biblioteca de Criativos</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-end' }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Período</h3>
            <CustomDateFilter onSearch={handleSearchDates} isSearching={loading} autoLoad7Days={true} />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
             <div>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)} 
                  style={{ background: 'white', color: 'black', border: 'none', borderRadius: '20px', padding: '0.6rem 1rem', outline: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem' }}
                >
                  <option value="SPEND_DESC">Investimento</option>
                  <option value="CPL_ASC">CPA (menor)</option>
                  <option value="ROAS_DESC">ROAS</option>
                  <option value="CTR_DESC">CTR</option>
                  <option value="CLICKS_DESC">Cliques</option>
                  <option value="RESULTS_DESC">Resultados</option>
                </select>
             </div>

             <div>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)} 
                  style={{ background: 'white', color: 'black', border: 'none', borderRadius: '20px', padding: '0.6rem 1rem', outline: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem' }}
                >
                  <option value="ALL">Todos</option>
                  <option value="ACTIVE">Ativos</option>
                  <option value="INACTIVE">Inativos</option>
                </select>
             </div>
          </div>
        </div>

      </div>

      {error && (
        <div style={{ background: 'rgba(255, 50, 50, 0.1)', border: '1px solid rgba(255, 50, 50, 0.3)', padding: '1rem', borderRadius: '8px', color: '#ffaaaa', marginBottom: '2rem', textAlign: 'center' }}>
          ⚠️ {error}
        </div>
      )}

      {creatives.length > 0 && (
         <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.1)', flex: 1, maxWidth: '400px' }}>
                <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar criativo..." 
                  style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }} 
                />
             </div>
         </div>
      )}

      {creatives.length === 0 && !loading && !error && (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
          Use o filtro de data acima para buscar os criativos da biblioteca.
        </div>
      )}

      <CreativesGallery creatives={filteredCreatives} />
    </div>
  );
};
