import React from 'react';

export const CustomFunnel = ({ data }) => {
  const { impressions, reach, frequency, clicks, ctr, leads, conversionRate, sales, cpa } = data;

  const formatNumber = (num) => num ? num.toLocaleString('pt-BR') : '0';
  const formatMoney = (num) => num ? `R$ ${num.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}` : 'R$ 0,00';
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '350px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Wrapper do Funil e Legendas */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '600px', height: '100%' }}>
        
        {/* Formas Geométricas (Clipped) */}
        <div 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: '5%', 
            right: '35%', // Deixa espaço para a legenda na direita
            bottom: 0, 
            clipPath: 'polygon(0 0, 100% 0, 65% 100%, 35% 100%)', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px' 
          }}
        >
          {/* Camada 1: Impressões */}
          <div style={{ flex: 1, background: 'linear-gradient(135deg, #4ade80, #22c55e)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#064e3b' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: '900', lineHeight: '1.2' }}>{formatNumber(impressions)}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Impressões</span>
          </div>

          {/* Camada 2: Cliques */}
          <div style={{ flex: 1, background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#064e3b' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '900', lineHeight: '1.2' }}>{formatNumber(clicks)}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Cliques no link</span>
          </div>

          {/* Camada 3: Leads */}
          <div style={{ flex: 1, background: 'linear-gradient(135deg, #16a34a, #15803d)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: '900', lineHeight: '1.2' }}>{formatNumber(leads)}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Leads / Contatos</span>
          </div>

          {/* Camada 4: Vendas */}
          <div style={{ flex: 1, background: 'linear-gradient(135deg, #15803d, #14532d)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: '900', lineHeight: '1.2' }}>{formatNumber(sales)}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Vendas</span>
          </div>
        </div>

        {/* Legendas Laterais Direitas */}
        {/* Usamos top: 12.5%, 37.5%, 62.5%, 87.5% para alinhar ao centro de cada um dos 4 blocos (que têm 25% de altura cada) */}
        
        <div style={{ position: 'absolute', right: 0, top: '12.5%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'right', width: '33%' }}>
          alcance {formatNumber(reach)} • freq {frequency.toFixed(2)}
        </div>

        <div style={{ position: 'absolute', right: 0, top: '37.5%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'right', width: '33%' }}>
          CTR total <span style={{ color: 'white', fontWeight: 'bold' }}>{ctr.toFixed(2)}%</span>
        </div>

        <div style={{ position: 'absolute', right: 0, top: '62.5%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'right', width: '33%' }}>
          <span style={{ color: 'white', fontWeight: 'bold' }}>{conversionRate.toFixed(2)}%</span> conversão de cliques
        </div>

        <div style={{ position: 'absolute', right: 0, top: '87.5%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'right', width: '33%' }}>
          CPA Médio <span style={{ color: 'white', fontWeight: 'bold' }}>{formatMoney(cpa)}</span>
        </div>

      </div>
    </div>
  );
};
