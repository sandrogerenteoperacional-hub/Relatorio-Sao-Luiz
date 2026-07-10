import React from 'react';

const FunnelLayer = ({ topWidth, bottomWidth, value, label, details, delay, color = 'var(--neon-green)', isLast = false }) => {
  if (value === '0' || value === 0) return null;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '2px', // gap
      animation: `fadeInUp 0.6s ease ${delay}s both`
    }}>
      <div style={{
        width: '60%', // max funnel width relative to container
        height: '90px',
        position: 'relative',
      }}>
        {/* The Trapezoid Background */}
        <div style={{
          position: 'absolute',
          top: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          height: '100%',
          background: color,
          clipPath: `polygon(${topWidth}% 0, ${100 - topWidth}% 0, ${100 - bottomWidth}% 100%, ${bottomWidth}% 100%)`,
        }} />
        
        {/* The Text Content */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--bg-dark)',
          pointerEvents: 'none',
          zIndex: 2
        }}>
          <div className="font-number" style={{ fontSize: '1.8rem', lineHeight: '1', marginTop: '5px' }}>
            {value}
          </div>
          {!isLast && (
            <div style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', opacity: 0.8, whiteSpace: 'nowrap' }}>
              {label}
            </div>
          )}
        </div>
      </div>
      
      {/* Label/Details Side Text */}
      <div style={{
        position: 'absolute',
        right: '10%',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        textAlign: 'right',
        width: '150px'
      }}>
        {isLast && (
          <div style={{ color: 'var(--neon-green-light)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
            {label}
          </div>
        )}
        {details}
      </div>
    </div>
  );
};

const FunnelChart = ({ data }) => {
  if (!data) return null;

  // Calculate dynamic data for the footer text
  const rawClicks = parseFloat(String(data.clicks.value).replace(/\./g, '').replace(',', '.'));
  const rawVisits = parseFloat(String(data.visits.value).replace(/\./g, '').replace(',', '.'));
  const rawLeads = parseFloat(String(data.leads.value).replace(/\./g, '').replace(',', '.'));

  const landingArrivalRate = rawClicks > 0 ? ((rawVisits / rawClicks) * 100).toFixed(0) : 0;
  const leadConversionRate = rawVisits > 0 ? ((rawLeads / rawVisits) * 100).toFixed(1) : 0;

  return (
    <div style={{ margin: '3rem 0', padding: '2rem 0', position: 'relative' }}>
      
      <div className="section-header" style={{ marginBottom: '3rem' }}>
        <div className="section-subtitle" style={{ color: 'var(--neon-green-light)' }}>DO ANÚNCIO AO LEAD • ANÚNCIOS ATIVOS</div>
        <div className="section-title">O funil</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <FunnelLayer 
          topWidth={0} bottomWidth={15} 
          value={data.impressions.value} label={data.impressions.label} 
          details={data.impressions.details} delay={0.1}
        />
        <FunnelLayer 
          topWidth={15} bottomWidth={30} 
          value={data.clicks.value} label={data.clicks.label} 
          details={data.clicks.details} delay={0.2}
        />
        <FunnelLayer 
          topWidth={30} bottomWidth={42} 
          value={data.visits.value} label={data.visits.label} 
          details={data.visits.details} delay={0.3}
        />
        <FunnelLayer 
          topWidth={data.visits.value === '0' || data.visits.value === 0 ? 30 : 42} bottomWidth={50} 
          value={data.leads.value} label={data.leads.label} 
          details={data.leads.details} delay={0.4}
          color="var(--neon-green-light)"
          isLast={true}
        />
      </div>

      <div className="card" style={{ marginTop: '3rem', textAlign: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="footer-text">
          A landing recebe <span className="highlight-green">{landingArrivalRate}% dos cliques</span> e converte <span className="highlight-green">~{leadConversionRate}% das visitas</span> em Leads (Dados dinâmicos) — página saudável. Todos os anúncios de fundo de funil apontam para a estrutura de conversão correta.
        </p>
      </div>
      
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default FunnelChart;
