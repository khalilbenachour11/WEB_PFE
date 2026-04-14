import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/global.css';

const API = 'http://localhost:5000/api';

export default function LoginPage({ onLogin }) {
  const [matricule, setMatricule] = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
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
            // Si table non vide → ne rien faire, silencieux
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
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
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