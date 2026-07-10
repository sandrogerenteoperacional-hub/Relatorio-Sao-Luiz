import React from 'react';

const ActiveCampaigns = ({ campaigns, pausedCount }) => {
  if (!campaigns || campaigns.length === 0) {
    return <div className="card" style={{ textAlign: 'center' }}>Nenhuma campanha ativa no momento.</div>;
  }

  return (
    <div className="card" style={{ animationDelay: '0.2s', overflow: 'hidden' }}>
      <div className="section-header" style={{ marginBottom: '1.5rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="section-subtitle">ACOMPANHAMENTO</div>
          <div className="section-title" style={{ fontSize: '1.8rem' }}>Todas as Campanhas Ativas</div>
        </div>
        {pausedCount > 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            * {pausedCount} campanhas inativas com gasto R$ 0,00 ocultadas
          </div>
        )}
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--neon-green)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '1rem' }}>Criativo / Campanha</th>
              <th style={{ padding: '1rem' }}>Investimento</th>
              <th style={{ padding: '1rem' }}>Impressões</th>
              <th style={{ padding: '1rem' }}>Cliques</th>
              <th style={{ padding: '1rem' }}>Resultados / Tipo</th>
              <th style={{ padding: '1rem' }}>Custo Médio</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((camp, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-main)', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={camp.name}>
                  {camp.name}
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }} className="font-number">{camp.invested}</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }} className="font-number">{camp.impressions}</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }} className="font-number">{camp.clicks}</td>
                <td style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: 'bold' }}>
                  <span className="font-number" style={{ fontSize: '1.1em' }}>{camp.results.split(' ')[0]}</span>
                  <span style={{ fontSize: '0.8em', marginLeft: '6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {camp.results.substring(camp.results.indexOf(' ') + 1)}
                  </span>
                </td>
                <td style={{ padding: '1rem', color: 'var(--neon-yellow)' }} className="font-number">{camp.cpl}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActiveCampaigns;
