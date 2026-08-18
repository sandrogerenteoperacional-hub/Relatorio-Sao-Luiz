import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';

const Settings = ({ clients, setClients, geminiApiKey, onSaveGemini, globalMetaToken, onSaveGlobalToken }) => {
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey || '');
  const [localGlobalToken, setLocalGlobalToken] = useState(globalMetaToken || '');
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentClient, setCurrentClient] = useState({ id: '', name: '', accountId: '', token: '', pageId: '' });

  const handleSaveGlobal = () => {
    onSaveGemini(localGeminiKey);
    if (onSaveGlobalToken) onSaveGlobalToken(localGlobalToken);
    alert('Configurações globais salvas!');
  };

  const handleAddOrEditClient = () => {
    if (!currentClient.name || !currentClient.accountId) {
      alert("Preencha Nome e Conta!");
      return;
    }

    let updatedClients;
    if (currentClient.id) {
      updatedClients = clients.map(c => c.id === currentClient.id ? currentClient : c);
    } else {
      const newClient = { ...currentClient, id: Date.now().toString() };
      updatedClients = [...clients, newClient];
    }
    
    setClients(updatedClients);
    setIsEditing(false);
    setCurrentClient({ id: '', name: '', accountId: '', token: '', pageId: '' });
  };

  const handleDeleteClient = (id) => {
    if(window.confirm("Deseja realmente remover este cliente?")) {
      setClients(clients.filter(c => c.id !== id));
    }
  };

  const openEdit = (client) => {
    setCurrentClient(client);
    setIsEditing(true);
  };

  const openAdd = () => {
    setCurrentClient({ id: '', name: '', accountId: '', token: '', pageId: '' });
    setIsEditing(true);
  };

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', animation: 'fadeInUp 0.3s ease' }}>
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.4rem' }}>Gerenciador de Clientes (Meta Ads)</h3>
      
      {!isEditing ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {clients.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ color: 'var(--text-muted)' }}>Nenhum cliente cadastrado.</p>
              </div>
            ) : (
              clients.map(client => (
                <div key={client.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'white' }}>{client.name}</h4>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <strong>Account ID:</strong> {client.accountId} <br/>
                      <strong>Page ID:</strong> {client.pageId || 'Não configurado'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openEdit(client)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}><Edit2 size={18} /></button>
                    <button onClick={() => handleDeleteClient(client.id)} style={{ background: 'transparent', border: 'none', color: '#ffaaaa', cursor: 'pointer', padding: '8px' }}><Trash2 size={18} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
          <button 
            onClick={openAdd}
            style={{
              background: 'var(--neon-green)', color: 'var(--bg-dark)', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <Plus size={18} /> Adicionar Novo Cliente
          </button>
        </>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h4 style={{ margin: 0, color: 'white' }}>{currentClient.id ? 'Editar Cliente' : 'Novo Cliente'}</h4>
            <button onClick={() => setIsEditing(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nome do Cliente (Identificação interna)</label>
              <input type="text" value={currentClient.name} onChange={e => setCurrentClient({...currentClient, name: e.target.value})} placeholder="Ex: Mercado São Luiz" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Ad Account ID (Conta Meta)</label>
              <input type="text" value={currentClient.accountId} onChange={e => setCurrentClient({...currentClient, accountId: e.target.value})} placeholder="Ex: 484404834087570" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Access Token (Opcional se usar Token Universal)</label>
              <input type="password" value={currentClient.token} onChange={e => setCurrentClient({...currentClient, token: e.target.value})} placeholder="EAA..." style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Facebook Page ID (Opcional - Usado para Automação)</label>
              <input type="text" value={currentClient.pageId || ''} onChange={e => setCurrentClient({...currentClient, pageId: e.target.value})} placeholder="Ex: 102968215747959" style={inputStyle} />
            </div>
          </div>
          
          <button 
            onClick={handleAddOrEditClient}
            style={{ background: 'var(--neon-green)', color: 'var(--bg-dark)', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={18} /> Salvar Cliente
          </button>
        </div>
      )}

      <h3 style={{ marginBottom: '1.5rem', marginTop: '3rem', color: 'var(--text-main)', fontSize: '1.4rem' }}>Configurações Globais</h3>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Token Universal (System User Meta)</label>
        <input type="password" value={localGlobalToken} onChange={(e) => setLocalGlobalToken(e.target.value)} placeholder="EAA..." style={inputStyle} />
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Se preenchido, os clientes que não tiverem um token específico usarão este token global.</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Google Gemini API Key</label>
        <input type="password" value={localGeminiKey} onChange={(e) => setLocalGeminiKey(e.target.value)} placeholder="AIza..." style={inputStyle} />
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Necessária para gerar os textos da aba Assistente I.A.</p>
      </div>
      <button 
        onClick={handleSaveGlobal}
        style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 'bold', cursor: 'pointer' }}
      >
        Salvar Configurações Globais
      </button>

    </div>
  );
};

const inputStyle = {
  width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontFamily: 'monospace', boxSizing: 'border-box'
};

export default Settings;
