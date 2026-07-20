import React, { useState } from 'react';
import { Calendar, Search } from 'lucide-react';

const CustomDateFilter = ({ onSearch, isSearching }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
    minWidth: '150px'
  };

  return (
    <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '2rem', animation: 'fadeInUp 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '300px' }}>
        <Calendar size={20} color="var(--neon-green)" />
        <span style={{ color: 'var(--text-muted)' }}>De:</span>
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)} 
          style={inputStyle} 
          max={endDate || undefined}
        />
        
        <span style={{ color: 'var(--text-muted)' }}>Até:</span>
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)} 
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
            Buscando...
          </>
        ) : (
          <>
            <Search size={18} /> Buscar Período
          </>
        )}
      </button>
    </div>
  );
};

export default CustomDateFilter;
