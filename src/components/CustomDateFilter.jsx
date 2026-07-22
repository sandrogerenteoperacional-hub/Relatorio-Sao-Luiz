import React, { useState } from 'react';
import { Calendar, Search } from 'lucide-react';

const CustomDateFilter = ({ onSearch, isSearching }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activePreset, setActivePreset] = useState('');

  const formatDate = (date) => date.toISOString().split('T')[0];

  const handlePreset = (preset) => {
    setActivePreset(preset);
    const today = new Date();
    let start, end;

    if (preset === 'Hoje') {
      start = end = today;
    } else if (preset === 'Ontem') {
      start = new Date(today);
      start.setDate(today.getDate() - 1);
      end = start;
    } else if (preset === 'Últimos 7 dias') {
      start = new Date(today);
      start.setDate(today.getDate() - 7);
      end = today;
    } else if (preset === 'Últimos 30 dias') {
      start = new Date(today);
      start.setDate(today.getDate() - 30);
      end = today;
    } else if (preset === 'Mês atual') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = today;
    } else if (preset === 'Mês passado') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    const startStr = formatDate(start);
    const endStr = formatDate(end);
    setStartDate(startStr);
    setEndDate(endStr);
    
    // Auto-search para agilidade (opcional, mas bom pra UX)
    onSearch(startStr, endStr);
  };

  const handleManualDateChange = (type, value) => {
    setActivePreset('');
    if (type === 'start') setStartDate(value);
    if (type === 'end') setEndDate(value);
  };

  const handleSearch = () => {
    if (startDate && endDate) {
      onSearch(startDate, endDate);
    }
  };

  const inputStyle = {
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
    fontFamily: 'inherit',
    flex: 1,
    minWidth: '130px'
  };

  const presetStyle = (preset) => ({
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    border: activePreset === preset ? '1px solid var(--neon-green)' : '1px solid rgba(255,255,255,0.2)',
    background: activePreset === preset ? 'rgba(0, 255, 128, 0.1)' : 'transparent',
    color: activePreset === preset ? 'var(--neon-green)' : 'var(--text-muted)',
    transition: 'all 0.2s'
  });

  const presets = ['Hoje', 'Ontem', 'Últimos 7 dias', 'Últimos 30 dias', 'Mês atual', 'Mês passado'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      
      {/* Botões Rápidos */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {presets.map(p => (
          <button key={p} onClick={() => handlePreset(p)} style={presetStyle(p)}>
            {p}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '300px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>De</span>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => handleManualDateChange('start', e.target.value)} 
            style={inputStyle} 
            max={endDate || undefined}
          />
          
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Até</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => handleManualDateChange('end', e.target.value)} 
            style={inputStyle} 
            min={startDate || undefined}
          />
        </div>

        <button 
          onClick={handleSearch}
          disabled={isSearching || !startDate || !endDate}
          style={{
            background: 'var(--neon-green)',
            color: 'var(--bg-dark)',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 'bold',
            cursor: isSearching || !startDate || !endDate ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isSearching || !startDate || !endDate ? 0.6 : 1,
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          {isSearching ? (
            <>
              <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
              Sincronizando...
            </>
          ) : (
            <>
              <Search size={18} /> Sincronizar
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CustomDateFilter;
