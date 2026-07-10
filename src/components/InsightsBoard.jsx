import React from 'react';

const InsightsBoard = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="card" style={{ animationDelay: '0.25s', marginBottom: '2rem' }}>
      <div className="section-subtitle" style={{ color: 'var(--neon-yellow)' }}>INTELIGÊNCIA ARTIFICIAL</div>
      <div className="section-title" style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Alertas & Oportunidades</div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {alerts.map((a, i) => {
          let bg = 'rgba(255, 255, 255, 0.05)';
          let border = '1px solid rgba(255, 255, 255, 0.1)';
          if (a.type === 'danger') {
            bg = 'rgba(255, 68, 68, 0.1)';
            border = '1px solid rgba(255, 68, 68, 0.3)';
          } else if (a.type === 'warning') {
            bg = 'rgba(255, 170, 0, 0.1)';
            border = '1px solid rgba(255, 170, 0, 0.3)';
          } else if (a.type === 'success') {
            bg = 'rgba(0, 255, 136, 0.1)';
            border = '1px solid rgba(0, 255, 136, 0.3)';
          }
          return (
            <div key={i} style={{ padding: '1rem', background: bg, border, borderRadius: '8px', fontSize: '0.9rem', lineHeight: '1.4' }}>
              {a.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InsightsBoard;
