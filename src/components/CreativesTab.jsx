import React, { useState } from 'react';
import { Search, Filter, SortDesc, SortAsc } from 'lucide-react';
import { CreativesGallery } from './CreativesGallery';
import CustomDateFilter from './CustomDateFilter';
import { fetchAdLevelInsights, fetchAdCreativesDetails } from '../services/metaApi';

export const CreativesTab = ({ accountId, token }) => {
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE
  const [sortBy, setSortBy] = useState('SPEND_DESC'); // SPEND_DESC, SPEND_ASC, NAME_ASC

  const handleSearchDates = async (startDate, endDate) => {
    if (!accountId || !token) {
      setError('Conta não configurada.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const adInsights = await fetchAdLevelInsights(accountId, token, startDate, endDate);
      
      // Pega os 50 anúncios com maior gasto no período
      const topAds = adInsights.sort((a, b) => (b.spend || 0) - (a.spend || 0)).slice(0, 50);
      const adIds = topAds.map(ad => ad.ad_id);
      
      if (adIds.length > 0) {
        const details = await fetchAdCreativesDetails(accountId, token, adIds);
        
        // Mesclar insights com detalhes criativos
        const merged = topAds.map(ad => {
          const detail = details.find(d => d.id === ad.ad_id);
          return {
            ...ad,
            status: detail?.status || ad.status,
            creative: detail?.creative || null
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
      if (sortBy === 'SPEND_DESC') return (b.spend || 0) - (a.spend || 0);
      if (sortBy === 'SPEND_ASC') return (a.spend || 0) - (b.spend || 0);
      if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'white', margin: 0 }}>Análise de Criativos</h1>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'white' }}>Selecione o Período</h3>
        <CustomDateFilter onSearch={handleSearchDates} isSearching={loading} />
      </div>

      {error && (
        <div style={{ background: 'rgba(255, 50, 50, 0.1)', border: '1px solid rgba(255, 50, 50, 0.3)', padding: '1rem', borderRadius: '8px', color: '#ffaaaa', marginBottom: '2rem', textAlign: 'center' }}>
          ⚠️ {error}
        </div>
      )}

      {creatives.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ flex: '1 1 250px' }}>
             <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Pesquisar</label>
             <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '0.5rem 1rem' }}>
                <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nome do anúncio..." 
                  style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }} 
                />
             </div>
          </div>
          
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Status</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '0.5rem', gap: '4px' }}>
              <Filter size={16} color="var(--text-muted)" style={{ marginRight: '4px' }} />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', cursor: 'pointer' }}>
                <option value="ALL" style={{color: 'black'}}>Todos</option>
                <option value="ACTIVE" style={{color: 'black'}}>Ativos</option>
                <option value="INACTIVE" style={{color: 'black'}}>Inativos</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Ordenar por</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '0.5rem', gap: '4px' }}>
              {sortBy.includes('DESC') ? <SortDesc size={16} color="var(--text-muted)" /> : <SortAsc size={16} color="var(--text-muted)" />}
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', cursor: 'pointer' }}>
                <option value="SPEND_DESC" style={{color: 'black'}}>Maior Gasto</option>
                <option value="SPEND_ASC" style={{color: 'black'}}>Menor Gasto</option>
                <option value="NAME_ASC" style={{color: 'black'}}>Nome (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {creatives.length === 0 && !loading && !error && (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
          Use o filtro de data acima para buscar os criativos que rodaram no período.
        </div>
      )}

      <CreativesGallery creatives={filteredCreatives} />
    </div>
  );
};
