import React from 'react';

const VariationBadge = ({ variation }) => {
  if (!variation) return null;
  const isUp = variation.dir === 'up';
  const color = variation.color === 'green' ? 'var(--neon-green-light)' : '#ff5555';
  
  return (
    <span style={{ 
      display: 'inline-flex', alignItems: 'center', gap: '2px',
      fontSize: '0.9rem', fontWeight: '800', color,
      marginLeft: '8px', verticalAlign: 'middle',
      fontFamily: 'var(--font-display)'
    }}>
      {isUp ? '↗' : '↘'} {variation.val}
    </span>
  );
};

const TopStats = ({ data }) => {
  if (!data) return null;

  return (
    <div className="stats-grid">
      {/* Investidos */}
      <div className="card stat-card" style={{ animationDelay: '0.1s', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
        <div className="stat-value font-number" style={{ color: 'var(--neon-green-light)', fontSize: '2.5rem' }}>
          <span style={{ fontSize: '1.2rem', verticalAlign: 'super', marginRight: '4px' }}>R$</span>
          {data.invested.value.replace('R$', '').trim()}
          <VariationBadge variation={data.invested.variation} />
        </div>
        <div className="stat-subtitle">{data.invested.subtitle}</div>
        <div className="stat-details">{data.invested.details}</div>
      </div>

      {/* Leads */}
      <div className="card stat-card" style={{ animationDelay: '0.2s', border: '1px solid var(--neon-green-light)' }}>
        <div className="stat-value font-number" style={{ color: 'var(--neon-green-light)', fontSize: '2.5rem' }}>
          {data.leads.value}
          <VariationBadge variation={data.leads.variation} />
        </div>
        <div className="stat-subtitle">{data.leads.subtitle}</div>
        <div className="stat-details">{data.leads.details}</div>
      </div>

      {/* CPL */}
      <div className="card stat-card" style={{ animationDelay: '0.3s', border: '1px solid var(--neon-yellow)' }}>
        <div className="stat-value font-number" style={{ color: 'var(--neon-yellow)', fontSize: '2.5rem' }}>
          <span style={{ fontSize: '1.2rem', verticalAlign: 'super', marginRight: '4px' }}>R$</span>
          {data.cpl.value.replace('R$', '').trim()}
          <VariationBadge variation={data.cpl.variation} />
        </div>
        <div className="stat-subtitle" style={{ color: '#ffffff' }}>{data.cpl.subtitle}</div>
        <div className="stat-details">{data.cpl.details}</div>
      </div>

      {/* CTR */}
      <div className="card stat-card" style={{ animationDelay: '0.4s', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
        <div className="stat-value font-number" style={{ color: 'var(--text-main)', fontSize: '2.5rem' }}>
          {data.ctr.value}
          <VariationBadge variation={data.ctr.variation} />
        </div>
        <div className="stat-subtitle">{data.ctr.subtitle}</div>
        <div className="stat-details">{data.ctr.details}</div>
      </div>
    </div>
  );
};

export default TopStats;
