import React, { useState } from 'react';

const Settings = ({ accountId, token, onSave, onSync, isSyncing }) => {
  const [localAccountId, setLocalAccountId] = useState(accountId || '');
  const [localToken, setLocalToken] = useState(token || '');

  const handleSaveAndSync = () => {
    onSave(localAccountId, localToken);
    onSync(localAccountId, localToken);
  };

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', animation: 'fadeInUp 0.3s ease' }}>
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.4rem' }}>Integração Meta Ads</h3>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Ad Account ID (Conta)
        </label>
        <input 
          type="text" 
          value={localAccountId}
          onChange={(e) => setLocalAccountId(e.target.value)}
          placeholder="Ex: 484404834087570"
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            fontFamily: 'monospace'
          }}
        />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Access Token (System User)
        </label>
        <input 
          type="password" 
          value={localToken}
          onChange={(e) => setLocalToken(e.target.value)}
          placeholder="EAA..."
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            fontFamily: 'monospace'
          }}
        />
      </div>

      <button 
        onClick={handleSaveAndSync}
        disabled={isSyncing || !localAccountId || !localToken}
        style={{
          background: 'var(--neon-green)',
          color: 'var(--bg-dark)',
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          fontWeight: 'bold',
          cursor: isSyncing || !localAccountId || !localToken ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          opacity: isSyncing || !localAccountId || !localToken ? 0.6 : 1,
          transition: 'all 0.2s'
        }}
      >
        {isSyncing ? (
          <>
            <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
            Sincronizando com Meta API...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
            Sincronizar Meta Ads
          </>
        )}
      </button>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Settings;
