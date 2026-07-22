import React from 'react';
import { Zap } from 'lucide-react';

export const CreativesGallery = ({ creatives }) => {
  if (!creatives || creatives.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
        Nenhum criativo encontrado para os filtros selecionados.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '3rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', marginBottom: '1.5rem' }}>
        <Zap /> Galeria de Criativos
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {creatives.map((ad, i) => {
          const creative = ad.creative || {};
          let imageUrl = creative.image_url || creative.thumbnail_url;
          
          // Buscar imagem em alta resolução
          if (creative.object_story_spec) {
            const spec = creative.object_story_spec;
            if (spec.video_data && spec.video_data.image_url) {
              imageUrl = spec.video_data.image_url;
            } else if (spec.link_data && spec.link_data.child_attachments && spec.link_data.child_attachments.length > 0) {
              // Pegar a imagem do primeiro card do carrossel
              const firstChild = spec.link_data.child_attachments[0];
              if (firstChild.image_url || firstChild.picture) {
                imageUrl = firstChild.image_url || firstChild.picture;
              }
            } else if (spec.link_data && spec.link_data.picture) {
              imageUrl = spec.link_data.picture;
            }
          }

          const isActive = ad.status === 'ACTIVE';

          return (
            <div key={ad.id || i} style={{ overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
              <div style={{ position: 'relative', height: '220px', backgroundColor: '#000' }}>
                {imageUrl ? (
                  <img src={imageUrl} alt={ad.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isActive ? 1 : 0.5 }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>
                    Sem miniatura
                  </div>
                )}
                
                {/* Badge Ativo/Inativo estilo Dropdown do exemplo */}
                <div style={{ 
                  position: 'absolute', top: '12px', right: '12px', 
                  background: isActive ? '#e6f4ea' : '#fce8e6', 
                  color: isActive ? '#137333' : '#c5221f', 
                  padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 'bold',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#137333' : '#c5221f' }}></div>
                  {isActive ? 'Ativo' : 'Inativo'}
                </div>
              </div>
              
              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'white', fontSize: '0.95rem', fontWeight: '600', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                  {ad.name}
                </h4>
                
                {/* Grid de 2 Colunas para Métricas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                  
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invest.</div>
                    <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: '500' }}>
                      R$ {parseFloat(ad.calculatedMetrics.spend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{ad.calculatedMetrics.cpa > 0 ? 'CPL' : 'CPA'}</div>
                    <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: '500' }}>
                      {ad.calculatedMetrics.cpa > 0 ? `R$ ${parseFloat(ad.calculatedMetrics.cpa).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ROAS</div>
                    <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: '500' }}>
                      {ad.calculatedMetrics.roas > 0 ? ad.calculatedMetrics.roas.toFixed(2) : '-'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CTR</div>
                    <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: '500' }}>
                      {ad.calculatedMetrics.ctr > 0 ? `${ad.calculatedMetrics.ctr.toFixed(2)}%` : '-'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cliques</div>
                    <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: '500' }}>
                      {ad.calculatedMetrics.clicks || 0}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Leads</div>
                    <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: '500' }}>
                      {ad.calculatedMetrics.result || 0}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
