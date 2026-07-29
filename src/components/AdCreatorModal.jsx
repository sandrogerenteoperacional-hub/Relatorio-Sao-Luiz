import React, { useState, useEffect } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, Image as ImageIcon, Zap, Download, Layers } from 'lucide-react';
import { fetchAdSetsForCampaigns, uploadAdImage, createAdCreative, createAd } from '../services/metaUploadApi';
import { fetchAutomationCreatives, fetchDriveImageAsFile } from '../services/automationIntegration';

export const AdCreatorModal = ({ isOpen, onClose, accountId, token }) => {
  const [adSets, setAdSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(false);
  
  // States for images
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [cardsData, setCardsData] = useState([]); // {title, body, file_id}
  
  const [formData, setFormData] = useState({
    pageId: localStorage.getItem('metaPageId') || '102968215747959',
    adsetId: '',
    name: '',
    title: '',
    body: '',
    link: '',
    ctaType: 'LEARN_MORE'
  });

  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [status, setStatus] = useState('idle'); // idle, uploading, creating_creative, creating_ad, success, error
  const [errorMsg, setErrorMsg] = useState('');

  // Automation Modal State
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoCreatives, setAutoCreatives] = useState([]);
  const [autoLoading, setAutoLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('');

  useEffect(() => {
    if (isOpen && accountId && token) {
      loadAdSets();
    }
  }, [isOpen, accountId, token]);

  const loadAdSets = async () => {
    try {
      setLoadingSets(true);
      const sets = await fetchAdSetsForCampaigns(accountId, token);
      const activeSets = sets.filter(s => s.status === 'ACTIVE' && s.campaign?.status !== 'PAUSED');
      setAdSets(activeSets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSets(false);
    }
  };

  const openAutoModal = async () => {
    setShowAutoModal(true);
    setAutoLoading(true);
    try {
      const creatives = await fetchAutomationCreatives();
      setAutoCreatives(creatives);
      if (creatives.length > 0) {
        const uniqueFolders = [...new Set(creatives.map(c => c.folder_name))];
        setSelectedFolder(uniqueFolders[0]);
      }
    } catch (err) {
      alert("Erro ao buscar criativos: " + err.message);
    } finally {
      setAutoLoading(false);
    }
  };

  const handleAutoFillSingle = async (item) => {
    try {
      setStatus('uploading'); // visual feedback
      const downloadedFile = await fetchDriveImageAsFile(item.file_id, item.name);
      
      setFiles([downloadedFile]);
      setPreviews([URL.createObjectURL(downloadedFile)]);
      setCardsData([item]);
      
      setFormData(prev => ({
        ...prev,
        title: item.title || prev.title,
        body: item.body || prev.body,
        name: `[Auto] ${item.folder_name} - ${item.name}`
      }));
      
      setShowAutoModal(false);
      setStatus('idle');
    } catch (err) {
      alert("Erro ao baixar imagem: " + err.message);
      setStatus('idle');
    }
  };

  const handleAutoFillCarousel = async (items) => {
    try {
      setStatus('uploading');
      
      // Baixa todas as imagens em paralelo
      const downloadPromises = items.map(item => fetchDriveImageAsFile(item.file_id, item.name));
      const downloadedFiles = await Promise.all(downloadPromises);
      
      setFiles(downloadedFiles);
      setPreviews(downloadedFiles.map(f => URL.createObjectURL(f)));
      setCardsData(items);
      
      setFormData(prev => ({
        ...prev,
        title: items[0]?.title || prev.title,
        body: "Confira nossas ofertas especiais! Arraste para o lado 👉", // Texto padrão para carrossel
        name: `[Auto] Carrossel - ${items[0]?.folder_name}`
      }));
      
      setShowAutoModal(false);
      setStatus('idle');
    } catch (err) {
      alert("Erro ao baixar imagens do Carrossel: " + err.message);
      setStatus('idle');
    }
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length > 0) {
      setFiles(selected);
      setPreviews(selected.map(f => URL.createObjectURL(f)));
      setCardsData([]); // Limpa dados da automação se subir manual
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updates = { [name]: value };
    
    // Auto fill whatsapp link
    if (name === 'ctaType' && value === 'WHATSAPP_MESSAGE') {
      updates.link = 'https://wa.me/5582991196991';
    }
    
    setFormData(prev => ({ ...prev, ...updates }));
    
    if (name === 'pageId') {
      localStorage.setItem('metaPageId', value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0 || !formData.pageId || !formData.adsetId) {
      setErrorMsg('Preencha os campos obrigatórios (Página, Imagem e Ad Set).');
      return;
    }

    try {
      setErrorMsg('');
      setStatus('uploading');
      
      // Upload de todas as imagens em paralelo para pegar os hashes
      const uploadPromises = files.map(file => uploadAdImage(accountId, token, file));
      const imageHashes = await Promise.all(uploadPromises);

      setStatus('creating_creative');
      
      // Montar os cartões para a API
      const creativeCards = imageHashes.map((hash, index) => {
        const cardData = cardsData[index] || {};
        return {
          imageHash: hash,
          title: cardData.title || formData.title, // Fallback para manual
          body: cardData.body || formData.body,
          link: formData.link
        };
      });

      const creativeId = await createAdCreative(accountId, token, {
        name: formData.name || formData.title,
        pageId: formData.pageId,
        imageHash: imageHashes[0], // fallback principal se não for carrossel
        title: formData.title,
        body: formData.body, // Main text
        link: formData.link,
        ctaType: formData.ctaType,
        cards: creativeCards
      });

      setStatus('creating_ad');
      await createAd(accountId, token, {
        name: formData.name || formData.title,
        adsetId: formData.adsetId,
        creativeId: creativeId,
        status: 'PAUSED'
      });

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  const resetForm = () => {
    setFiles([]);
    setPreviews([]);
    setCardsData([]);
    setFormData(prev => ({ ...prev, name: '', title: '', body: '', link: '' }));
    setStatus('idle');
    setErrorMsg('');
  };

  if (!isOpen) return null;

  const uniqueFolders = [...new Set(autoCreatives.map(c => c.folder_name))];
  const filteredCreatives = autoCreatives.filter(c => c.folder_name === selectedFolder);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
      display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)'
    }}>
      {/* Inner Automation Modal */}
      {showAutoModal && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'var(--bg-dark)', border: '1px solid var(--theme-border)', borderRadius: '16px',
          width: '90%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto', padding: '2rem', zIndex: 10000,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap color="var(--neon-green)" /> Importar da Automação
            </h2>
            <button type="button" onClick={() => setShowAutoModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
          </div>
          
          {autoLoading ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando criativos do banco de dados...</p>
          ) : (
            <>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Selecione a Ação / Pasta</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <select 
                  value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-card-bg)', color: 'var(--theme-text)' }}
                >
                  {uniqueFolders.map(folder => <option key={folder} value={folder}>{folder}</option>)}
                </select>
                <button 
                  type="button"
                  onClick={() => handleAutoFillCarousel(filteredCreatives)}
                  disabled={filteredCreatives.length < 2 || status === 'uploading'}
                  style={{ background: 'var(--theme-border)', color: 'var(--theme-text)', border: 'none', borderRadius: '8px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: (filteredCreatives.length < 2 || status === 'uploading') ? 'not-allowed' : 'pointer', opacity: (filteredCreatives.length < 2 || status === 'uploading') ? 0.5 : 1, fontWeight: 'bold' }}
                >
                  <Layers size={18} /> Importar Lote como Carrossel
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {filteredCreatives.map(item => (
                  <div key={item.file_id} style={{ border: '1px solid var(--theme-border)', borderRadius: '12px', padding: '1rem', background: 'var(--theme-card-bg)' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--theme-text)', marginBottom: '4px', fontSize: '0.95rem' }}>{item.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', maxHeight: '60px', overflow: 'hidden' }}>{item.body}</div>
                    <button 
                      type="button"
                      onClick={() => handleAutoFillSingle(item)}
                      disabled={status === 'uploading'}
                      style={{ width: '100%', padding: '8px', background: 'var(--theme-border)', color: 'var(--theme-text)', border: 'none', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', cursor: status === 'uploading' ? 'not-allowed' : 'pointer', opacity: status === 'uploading' ? 0.5 : 1 }}
                    >
                      <Download size={16} /> Usar Imagem e Texto (Unitário)
                    </button>
                  </div>
                ))}
              </div>
              {filteredCreatives.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhum criativo encontrado nesta pasta.</p>}
            </>
          )}
        </div>
      )}


      {/* Main Modal */}
      <div style={{
        background: 'var(--bg-dark)', border: '1px solid var(--theme-border)',
        borderRadius: '16px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto',
        padding: '2rem', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        opacity: showAutoModal ? 0.4 : 1, pointerEvents: showAutoModal ? 'none' : 'auto'
      }}>
        <button 
          type="button"
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Upload size={24} color="var(--neon-green)" /> Subir Novo Criativo
          </h2>
          <button 
            type="button"
            onClick={openAutoModal}
            style={{ background: 'var(--theme-border)', color: 'var(--theme-text)', border: 'none', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <Zap size={18} color="#FFD700" /> Puxar Automação
          </button>
        </div>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <CheckCircle2 size={64} color="var(--neon-green)" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ color: 'var(--theme-text)' }}>Criativo Publicado com Sucesso!</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>O anúncio foi criado e está <strong>Pausado</strong> no Meta Ads. Você já pode ativá-lo pelo Gerenciador.</p>
            <button 
              type="button"
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
                <input type="file" accept="image/*" multiple onChange={handleFileChange} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                {previews.length > 0 ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px' }}>
                    {previews.slice(0, 4).map((src, i) => (
                       <img key={i} src={src} alt="Preview" style={{ flex: '1 1 45%', height: '45%', objectFit: 'cover', borderRadius: '8px' }} />
                    ))}
                    {previews.length > 4 && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontWeight: 'bold' }}>
                         +{previews.length - 4} imagens
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ImageIcon size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Clique ou arraste imagens aqui</p>
                  </div>
                )}
              </div>
              {previews.length > 1 && (
                <div style={{ color: 'var(--neon-green)', fontSize: '0.8rem', textAlign: 'center', fontWeight: 'bold' }}>
                  Modo Carrossel ({previews.length} imagens)
                </div>
              )}

              <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', marginTop: '1rem' }}>Page ID (Página do Facebook) *</label>
              <input 
                type="text" name="pageId" value={formData.pageId} onChange={handleChange} required
                placeholder="Ex: 1234567890"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-card-bg)', color: 'var(--theme-text)', boxSizing: 'border-box' }}
              />
            </div>

            {/* Direita: Textos e Configurações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Campanha *</label>
                <select 
                  value={selectedCampaignId} 
                  onChange={(e) => {
                    setSelectedCampaignId(e.target.value);
                    setFormData({ ...formData, adsetId: '' });
                  }} 
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-card-bg)', color: 'var(--theme-text)', marginBottom: '1rem' }}
                >
                  <option value="">Selecione a Campanha</option>
                  {Array.from(new Set(adSets.map(s => s.campaign?.id)))
                    .map(id => adSets.find(s => s.campaign?.id === id)?.campaign)
                    .filter(Boolean)
                    .map(camp => (
                      <option key={camp.id} value={camp.id}>{camp.name}</option>
                  ))}
                </select>

                <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Conjunto de Anúncios *</label>
                <select 
                  name="adsetId" value={formData.adsetId} onChange={handleChange} required
                  disabled={!selectedCampaignId}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-card-bg)', color: 'var(--theme-text)', opacity: selectedCampaignId ? 1 : 0.5 }}
                >
                  <option value="">Selecione o Conjunto</option>
                  {adSets.filter(s => s.campaign?.id === selectedCampaignId).map(set => (
                    <option key={set.id} value={set.id}>{set.name}</option>
                  ))}
                </select>
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
                <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Título Principal (Headline)</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Botão</label>
                  <select 
                    name="ctaType" value={formData.ctaType} onChange={handleChange} required
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-card-bg)', color: 'var(--theme-text)', boxSizing: 'border-box' }}
                  >
                    <option value="LEARN_MORE">Saiba Mais</option>
                    <option value="WHATSAPP_MESSAGE">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>URL de Destino (Link)</label>
                  <input 
                    type="url" name="link" value={formData.link} onChange={handleChange} required
                    placeholder="https://seusite.com.br"
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-card-bg)', color: 'var(--theme-text)', boxSizing: 'border-box' }}
                  />
                </div>
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
                 status === 'uploading' ? `1/3 Trabalhando com Imagens...` : 
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
