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
            <div key={ad.id || i} className="card" style={{ overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ position: 'relative', height: '200px', backgroundColor: '#000' }}>
                {imageUrl ? (
                  <img src={imageUrl} alt={ad.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isActive ? 1 : 0.5 }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>
                    Sem miniatura disponível
                  </div>
                )}
                <div style={{ position: 'absolute', top: '10px', right: '10px', background: isActive ? 'var(--neon-green)' : '#666', color: isActive ? '#000' : '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  {isActive ? 'ATIVO' : 'INATIVO'}
                </div>
              </div>
              <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'white', fontSize: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {ad.name}
                </h4>
                {creative.body && (
                  <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {creative.body}
                  </p>
                )}
                
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                   <span style={{ color: 'var(--text-muted)' }}>ID: {ad.id}</span>
                   {ad.spend !== undefined && (
                     <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>
                        Gasto: R$ {parseFloat(ad.spend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </span>
                   )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
