import React, { useState, useEffect } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { fetchAdSetsForCampaigns, uploadAdImage, createAdCreative, createAd } from '../services/metaUploadApi';

export const AdCreatorModal = ({ isOpen, onClose, accountId, token }) => {
  const [adSets, setAdSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(false);
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  
  const [formData, setFormData] = useState({
    pageId: '',
    adsetId: '',
    name: '',
    title: '',
    body: '',
    link: ''
  });

  const [status, setStatus] = useState('idle'); // idle, uploading, creating_creative, creating_ad, success, error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && accountId && token) {
      loadAdSets();
    }
  }, [isOpen, accountId, token]);

  const loadAdSets = async () => {
    try {
      setLoadingSets(true);
      const sets = await fetchAdSetsForCampaigns(accountId, token);
      // Filter only active campaigns and active adsets to make it cleaner
      const activeSets = sets.filter(s => s.status === 'ACTIVE' && s.campaign?.status !== 'PAUSED');
      setAdSets(activeSets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSets(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !formData.pageId || !formData.adsetId) {
      setErrorMsg('Preencha os campos obrigatórios (Página, Imagem e Ad Set).');
      return;
    }

    try {
      setErrorMsg('');
      
      // Step 1: Upload Image
      setStatus('uploading');
      const imageHash = await uploadAdImage(accountId, token, file);

      // Step 2: Create Creative
      setStatus('creating_creative');
      const creativeId = await createAdCreative(accountId, token, {
        name: formData.name || formData.title,
        pageId: formData.pageId,
        imageHash,
        title: formData.title,
        body: formData.body,
        link: formData.link
      });

      // Step 3: Create Ad
      setStatus('creating_ad');
      const adId = await createAd(accountId, token, {
        name: formData.name || formData.title,
        adsetId: formData.adsetId,
        creativeId: creativeId,
        status: 'PAUSED' // As agreed, default to paused for safety
      });

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setFormData({ ...formData, name: '', title: '', body: '', link: '' });
    setStatus('idle');
    setErrorMsg('');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
      display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        background: 'var(--bg-dark)', border: '1px solid var(--theme-border)',
        borderRadius: '16px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto',
        padding: '2rem', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        <h2 style={{ marginTop: 0, marginBottom: '2rem', color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Upload size={24} color="var(--neon-green)" /> Subir Novo Criativo
        </h2>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <CheckCircle2 size={64} color="var(--neon-green)" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ color: 'var(--theme-text)' }}>Criativo Publicado com Sucesso!</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>O anúncio foi criado e está <strong>Pausado</strong> no Meta Ads. Você já pode ativá-lo pelo Gerenciador.</p>
            <button 
              onClick={resetForm}
              style={{ background: 'var(--neon-green)', color: 'var(--bg-dark)', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Criar Outro
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            {/* Esquerda: Arquivo e Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>Imagem do Criativo *</label>
              <div style={{ 
                border: '2px dashed var(--theme-border)', borderRadius: '12px', height: '200px',
                display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
                background: 'var(--theme-card-bg)', position: 'relative', cursor: 'pointer'
              }}>
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                {preview ? (
                  <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ImageIcon size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Clique ou arraste a imagem aqui</p>
                  </div>
                )}
              </div>

              <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', marginTop: '1rem' }}>Page ID (Página do Facebook) *</label>
              <input 
                type="text" name="pageId" value={formData.pageId} onChange={handleChange} required
                placeholder="Ex: 1234567890"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-card-bg)', color: 'var(--theme-text)', boxSizing: 'border-box' }}
              />
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Você encontra o Page ID na seção "Sobre" da sua Página.</p>
            </div>

            {/* Direita: Textos e Configurações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Campanha / Conjunto de Anúncios *</label>
                <select 
                  name="adsetId" value={formData.adsetId} onChange={handleChange} required
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-card-bg)', color: 'var(--theme-text)' }}
                >
                  <option value="">Selecione o Conjunto</option>
                  {adSets.map(set => (
                    <option key={set.id} value={set.id}>{set.campaign?.name} - {set.name}</option>
                  ))}
                </select>
                {loadingSets && <span style={{ fontSize: '0.8rem', color: 'var(--neon-green)' }}>Carregando...</span>}
              </div>

              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Nome Interno do Anúncio</label>
                <input 
                  type="text" name="name" value={formData.name} onChange={handleChange} required
                  placeholder="Ex: AD_01_Promoção"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-card-bg)', color: 'var(--theme-text)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Título (Headline)</label>
                <input 
                  type="text" name="title" value={formData.title} onChange={handleChange} required
                  placeholder="Ex: Oferta Imperdível"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-card-bg)', color: 'var(--theme-text)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Texto Principal (Copy)</label>
                <textarea 
                  name="body" value={formData.body} onChange={handleChange} required
                  placeholder="Escreva a copy do anúncio..."
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-card-bg)', color: 'var(--theme-text)', minHeight: '80px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>URL de Destino (Link)</label>
                <input 
                  type="url" name="link" value={formData.link} onChange={handleChange} required
                  placeholder="https://seusite.com.br"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-card-bg)', color: 'var(--theme-text)', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Rodapé e Erros */}
            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              {errorMsg && (
                <div style={{ background: 'rgba(255,50,50,0.1)', color: '#ffaaaa', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <AlertCircle size={18} /> {errorMsg}
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={status !== 'idle' && status !== 'error'}
                style={{ 
                  width: '100%', padding: '16px', background: 'var(--neon-green)', color: 'var(--bg-dark)', 
                  border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer',
                  opacity: (status !== 'idle' && status !== 'error') ? 0.7 : 1
                }}
              >
                {status === 'idle' || status === 'error' ? 'Publicar Anúncio' : 
                 status === 'uploading' ? '1/3 Enviando Imagem...' : 
                 status === 'creating_creative' ? '2/3 Montando Criativo...' : 
                 '3/3 Finalizando Publicação...'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
