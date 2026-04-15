import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Pagination from '../components/Pagination'; 
import '../styles/global.css';

const API = 'http://localhost:5000/api';

// ══════════════════════════════════════════════════════════════════════════════
// FORMATAGE DATE (heure tunisienne)
// ══════════════════════════════════════════════════════════════════════════════

const formatDateOnly = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Africa/Tunis',
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════════════════════════

function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message.text) return;
    setVisible(true);
    const hide  = setTimeout(() => setVisible(false), 2800);
    const clear = setTimeout(() => onDone(), 3300);
    return () => { clearTimeout(hide); clearTimeout(clear); };
  }, [message]);

  if (!message.text) return null;

  const isSuccess = message.type === 'success';

  return (
    <div style={{
      position: 'fixed',
      top: 24,
      right: 24,
      zIndex: 9999,
      minWidth: 280,
      maxWidth: 380,
      background: isSuccess ? '#1e7e34' : '#c0392b',
      color: '#fff',
      borderRadius: 10,
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.35s cubic-bezier(.4,0,.2,1), opacity 0.35s ease',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>
        {isSuccess ? '✓' : '✕'}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
          {isSuccess ? 'Succès' : 'Erreur'}
        </div>
        <div style={{ fontSize: 13, opacity: 0.92 }}>{message.text}</div>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(onDone, 350); }}
        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1, opacity: 0.8 }}
      >✕</button>
    </div>
  );
}

// ── Modal Attribution ──
function ModalAttribution({ appareil, agents, onClose, onSuccess }) {
  const [matricule_agent, setMatriculeAgent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!matricule_agent) { setError('Veuillez choisir un agent.'); return; }
    setLoading(true);
    try {
      const res = await axios.put(`${API}/attribuer_appareil/${appareil.num_serie}`, { matricule_agent });
      if (res.data.success) { onSuccess(); onClose(); }
      else setError(res.data.message || 'Erreur inconnue');
    } catch { setError('Erreur de connexion au serveur'); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-icon">🔄</div>
        <div className="modal-title">Attribuer l'appareil</div>
        <div className="modal-message">Appareil N° <strong>{appareil.num_serie}</strong></div>
        {error && (
          <div style={{ background: '#fdecea', border: '1px solid #f5c6cb', color: '#c0392b', borderRadius: 7, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>
            ✕ {error}
          </div>
        )}
        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">Agent disponible</label>
            <select className="form-input" value={matricule_agent} onChange={e => setMatriculeAgent(e.target.value)}>
              <option value="">-- Choisir un agent --</option>
              {agents.length === 0
                ? <option disabled>Aucun agent disponible</option>
                : agents.map(a => (
                  <option key={a.matricule_agent} value={a.matricule_agent}>
                    {a.matricule_agent} — {a.prenom} {a.nom}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Attribution...' : '✓ Attribuer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Modifier ──
function ModalModifier({ appareil, onClose, onSuccess }) {
  const [form, setForm] = useState({
    num_serie: appareil.num_serie,
    date_de_mise_en_service: appareil.date_de_mise_en_service || ''
  });
  const [agentMode,       setAgentMode]       = useState('keep');
  const [newMatricule,    setNewMatricule]     = useState('');
  const [loadingAgents,   setLoadingAgents]    = useState(false);
  const [availableAgents, setAvailableAgents]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const hasAgent = !!(appareil.matricule_agent);

  useEffect(() => {
    if (agentMode !== 'change') return;
    setLoadingAgents(true);
    axios.get(`${API}/agents`)
      .then(res => {
        const receveurs = (res.data.agents || []).filter(a => a.role === 'receveur');
        setAvailableAgents(receveurs);
      })
      .catch(() => setAvailableAgents([]))
      .finally(() => setLoadingAgents(false));
  }, [agentMode]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const r1 = await axios.put(`${API}/modifier_appareil/${appareil.num_serie}`, form);
      if (!r1.data.success) { setError(r1.data.message || 'Erreur modification appareil'); setLoading(false); return; }
      const newNumSerie = form.num_serie;
      if (agentMode === 'remove' && hasAgent) {
        await axios.put(`${API}/modifier_statut/${newNumSerie}`, { statut: 'en stocke', liberer: true });
      } else if (agentMode === 'change' && newMatricule) {
        if (hasAgent) await axios.put(`${API}/modifier_statut/${newNumSerie}`, { statut: 'en stocke', liberer: true });
        await axios.put(`${API}/attribuer_appareil/${newNumSerie}`, { matricule_agent: newMatricule });
      }
      onSuccess();
      onClose();
    } catch {
      setError('Erreur de connexion au serveur');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div className="modal-icon">🖊️</div>
        <div className="modal-title">Modifier l'appareil</div>
        {error && (
          <div style={{ background: '#fdecea', border: '1px solid #f5c6cb', color: '#c0392b', borderRadius: 7, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>
            ✕ {error}
          </div>
        )}
        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">N° Série</label>
            <input className="form-input" value={form.num_serie}
              onChange={e => setForm({ ...form, num_serie: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Date mise en service</label>
            <input type="date" className="form-input" value={form.date_de_mise_en_service}
              onChange={e => setForm({ ...form, date_de_mise_en_service: e.target.value })} />
          </div>
          <div style={{ borderTop: '1px solid var(--border,#e0e0e0)', margin: '16px 0' }} />
          <div className="form-group">
            <label className="form-label">Receveur actuel</label>
            {hasAgent ? (
              <div style={{ padding: '8px 12px', background: 'var(--bg-secondary,#f5f5f5)', borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge-matricule">{appareil.matricule_agent}</span>
                <span>{appareil.prenom} {appareil.nom}</span>
              </div>
            ) : (
              <div style={{ padding: '8px 12px', background: 'var(--bg-secondary,#f5f5f5)', borderRadius: 6, fontSize: 13, color: 'var(--text-muted,#888)' }}>
                Non attribué
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Modifier le receveur</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="radio" name="agentMode" value="keep" checked={agentMode === 'keep'} onChange={() => setAgentMode('keep')} />
                Garder le receveur actuel
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="radio" name="agentMode" value="change" checked={agentMode === 'change'} onChange={() => setAgentMode('change')} />
                Changer de receveur
              </label>
              {hasAgent && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="radio" name="agentMode" value="remove" checked={agentMode === 'remove'} onChange={() => setAgentMode('remove')} />
                  <span style={{ color: '#c0392b' }}>Retirer le receveur (libérer l'appareil)</span>
                </label>
              )}
            </div>
          </div>
          {agentMode === 'change' && (
            <div className="form-group">
              <label className="form-label">Nouveau receveur</label>
              {loadingAgents ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted,#888)', padding: '8px 0' }}>Chargement des agents...</div>
              ) : (
                <select className="form-input" value={newMatricule} onChange={e => setNewMatricule(e.target.value)}>
                  <option value="">-- Choisir un receveur --</option>
                  {availableAgents.map(a => (
                    <option key={a.matricule_agent} value={a.matricule_agent}
                      style={String(a.matricule_agent) === String(appareil.matricule_agent) ? { fontWeight: 'bold' } : {}}
                    >
                      {a.matricule_agent} — {a.prenom} {a.nom}
                      {String(a.matricule_agent) === String(appareil.matricule_agent) ? ' (actuel)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          {agentMode === 'remove' && (
            <div style={{ background: '#fdecea', border: '1px solid #f5c6cb', color: '#c0392b', borderRadius: 7, padding: '10px 14px', fontSize: 13 }}>
              ⚠ Le receveur sera libéré et l'appareil passera en statut <strong>en stock</strong>.
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn" onClick={handleSubmit} disabled={loading || (agentMode === 'change' && !newMatricule)}>
            {loading ? 'Enregistrement...' : '✓ Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dropdown Actions ──
function ActionDropdown({ app, onStatut, onAttribuer, onModifier }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="dropdown-wrapper">
      <button className="dropdown-btn" onClick={() => setOpen(!open)}>
        Actions {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="dropdown-menu">
          <button className="dropdown-item" onClick={() => { onModifier(app); setOpen(false); }}>
            🖊️ Modifier
          </button>
          <button className="dropdown-item" onClick={() => { onStatut(app, 'en panne'); setOpen(false); }}>
            🔴 En panne
          </button>
          <button className="dropdown-item" onClick={() => { onStatut(app, 'en stocke'); setOpen(false); }}>
             🟢 En stock
          </button>
          {app.statut === 'en stocke' && (
            <button className="dropdown-item" onClick={() => { onAttribuer(app); setOpen(false); }}>
              🔵 Attribuer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page principale ──
export default function ListeAppareils() {
  const navigate = useNavigate();
  const [appareils,           setAppareils]           = useState([]);
  const [agents,              setAgents]              = useState([]);
  const [search,              setSearch]              = useState('');
  const [appareilAttribution, setAppareilAttribution] = useState(null);
  const [appareilModifier,    setAppareilModifier]    = useState(null);
  const [message,             setMessage]             = useState({ text: '', type: '' });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search]);

  const fetchAll = async () => {
    try { const r = await axios.get(`${API}/appareils`);     setAppareils(r.data.appareils || []); } catch { setAppareils([]); }
    try { const r = await axios.get(`${API}/agents_libres`); setAgents(r.data.agents     || []); } catch { setAgents([]); }
  };

  const showMessage = (text, type) => setMessage({ text, type });

  const handleStatut = async (app, statutCible) => {
    try {
      const res = await axios.put(`${API}/modifier_statut/${app.num_serie}`,
        { statut: statutCible, liberer: app.statut === 'actif' }
      );
      if (res.data.success) { showMessage('Statut modifié avec succès.', 'success'); fetchAll(); }
      else showMessage(res.data.message, 'error');
    } catch { showMessage('Erreur de connexion au serveur.', 'error'); }
  };

  const filtered = appareils.filter(a =>
    String(a.num_serie).includes(search) ||
    (a.statut  || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.nom     || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.prenom  || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages       = Math.ceil(filtered.length / itemsPerPage);
  const indexOfLastItem  = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems     = filtered.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div>
      <Toast message={message} onDone={() => setMessage({ text: '', type: '' })} />

      {appareilAttribution && (
        <ModalAttribution appareil={appareilAttribution} agents={agents}
          onClose={() => setAppareilAttribution(null)}
          onSuccess={() => { showMessage('Appareil attribué avec succès.', 'success'); fetchAll(); }} />
      )}
      {appareilModifier && (
        <ModalModifier
          appareil={appareilModifier}
          onClose={() => setAppareilModifier(null)}
          onSuccess={() => { showMessage('Appareil modifié avec succès.', 'success'); fetchAll(); }}
        />
      )}

      <div className="breadcrumb">SRTB › Direction › <span>Liste des appareils</span></div>
      <div className="page-header">
        <div>
          <div className="page-title">Liste des appareils</div>
          <div className="page-subtitle">
            {filtered.length} appareil(s) trouvé(s) — {agents.length} agent(s) disponible(s)
          </div>
        </div>
        <button className="btn" onClick={() => navigate('/ajouter-appareil')}>➕ Ajouter appareil</button>
      </div>

      <div className="card">
        <input className="search-input"
          placeholder="Rechercher par numéro série, statut ou agent..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <table className="data-table">
          <thead>
            <tr>
              <th>N° Série</th><th>Statut</th><th>Date mise en service</th>
              <th>Agent possesseur</th><th>Matricule</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? currentItems.map(app => (
              <tr key={app.num_serie}>
                <td><span className="badge-matricule">{app.num_serie}</span></td>
                <td>
                  <span className={`badge-role ${
                    app.statut === 'actif'    ? 'direction' :
                    app.statut === 'en panne' ? 'red'       : 'receveur'
                  }`}>{app.statut}</span>
                </td>
                <td>{formatDateOnly(app.date_de_mise_en_service)}</td>
                <td>{app.nom ? `${app.prenom} ${app.nom}` : <span className="text-muted">Non attribué</span>}</td>
                <td>{app.matricule_agent ? <span className="badge-matricule">{app.matricule_agent}</span> : '—'}</td>
                <td>
                  <ActionDropdown app={app}
                    onStatut={handleStatut}
                    onAttribuer={setAppareilAttribution}
                    onModifier={setAppareilModifier} />
                </td>
              </tr>
            )) : (
              <tr className="empty-row"><td colSpan={6}>Aucun appareil trouvé</td></tr>
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>
    </div>
  );
}