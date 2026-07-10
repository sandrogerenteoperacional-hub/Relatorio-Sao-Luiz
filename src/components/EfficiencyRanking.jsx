import React from 'react';

const EfficiencyRanking = ({ campaigns }) => {
  // Filter only campaigns with leads/conversations and results > 0
  const leadCamps = campaigns.filter(c => (c.resultType === 'Leads' || c.resultType === 'Conversas') && c.rawCpl > 0);
  
  if (!leadCamps || leadCamps.length === 0) return null;

  // Sort by CPL ascending
  const sorted = [...leadCamps].sort((a, b) => a.rawCpl - b.rawCpl);

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <div className="section-header" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
        <div className="section-subtitle" style={{ color: 'var(--neon-green)' }}>PERFORMANCE</div>
        <div className="section-title" style={{ fontSize: '1.4rem' }}>Ranking de Eficiência (Leads)</div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <th style={{ padding: '0.8rem 1rem' }}>Rank</th>
              <th style={{ padding: '0.8rem 1rem' }}>Campanha</th>
              <th style={{ padding: '0.8rem 1rem' }}>Leads</th>
              <th style={{ padding: '0.8rem 1rem' }}>Custo (CPL)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((camp, idx) => {
              let color = 'var(--text-main)';
              if (idx < 3) color = 'var(--neon-green)'; // Top 3
              if (idx >= sorted.length - 3 && sorted.length >= 5) color = '#ff4444'; // Bottom 3 (if enough items)
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.8rem 1rem', color, fontWeight: 'bold' }}>#{idx + 1}</td>
                  <td style={{ padding: '0.8rem 1rem', color: 'var(--text-main)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={camp.name}>
                    {camp.name}
                  </td>
                  <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)' }} className="font-number">{camp.results}</td>
                  <td style={{ padding: '0.8rem 1rem', color, fontWeight: 'bold' }} className="font-number">{camp.cpl}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EfficiencyRanking;
