import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/global.css';

// --- Sub-Components ---

const Notification = ({ message, onDone }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message.text) return;
    setVisible(true);
    const hide = setTimeout(() => setVisible(false), 3500);
    const clear = setTimeout(() => onDone(), 3300);
    return () => { clearTimeout(hide); clearTimeout(clear); };
  }, [message, onDone]);

  if (!message.text) return null;

  const isSuccess = message.type === 'success';

  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      minWidth: 280, maxWidth: 380,
      background: isSuccess ? '#1e7e34' : '#c0392b',
      color: '#fff', borderRadius: 10, padding: '14px 18px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.35s cubic-bezier(.4,0,.2,1), opacity 0.35s ease',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>{isSuccess ? '✓' : '✕'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
          {isSuccess ? 'Succès' : 'Erreur'}
        </div>
        <div style={{ fontSize: 13, opacity: 0.92 }}>{message.text}</div>
      </div>
      <button onClick={() => { setVisible(false); setTimeout(onDone, 350); }}
        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, opacity: 0.8 }}>
        ✕
      </button>
    </div>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 9) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 5) pages.push('...');
      const start = Math.max(2, currentPage - 3);
      const end = Math.min(totalPages - 1, currentPage + 3);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 4) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', flexWrap: 'wrap' }}>
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
        style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--color-border-tertiary)', background: currentPage === 1 ? 'var(--color-background-secondary)' : 'var(--color-background-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
        ← Précédent
      </button>
      {getPageNumbers().map((page, idx) => (
        page === '...' ? <span key={`dots-${idx}`}>...</span> :
          <button key={page} onClick={() => onPageChange(page)} disabled={page === currentPage}
            style={{ width: '36px', height: '36px', borderRadius: '4px', border: page === currentPage ? '2px solid #1a73e8' : '1px solid var(--color-border-tertiary)', background: page === currentPage ? '#e8f0fe' : 'var(--color-background-primary)', color: page === currentPage ? '#1a73e8' : 'inherit', fontWeight: page === currentPage ? '600' : '500' }}>
            {page}
          </button>
      ))}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
        style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--color-border-tertiary)', background: currentPage === totalPages ? 'var(--color-background-secondary)' : 'var(--color-background-primary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>
        Suivant →
      </button>
    </div>
  );
};

// --- Main Component ---

const API = 'http://localhost:5000/api';

const formatDateOnly = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const roleLabels = { informatique: 'Service Informatique', direction: 'Direction', controleur: 'Contrôleur des recettes' };
const roleColors = { informatique: 'informatique', direction: 'direction', controleur: 'receveur' };

function ModalRole({ agent, onClose, onSuccess }) {
  const [role_web, setRoleWeb] = useState('direction');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/utilisateurs_web`, { matricule_agent: agent.matricule_agent, role_web });
      if (res.data.success) { onSuccess(); onClose(); }
      else setError(res.data.message);
    } catch { setError('Erreur de connexion au serveur.'); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-icon">🔐</div>
        <div className="modal-title">Définir le rôle web</div>
        <div className="modal-message">
          Agent : <strong>{agent.prenom} {agent.nom}</strong><br />Matricule : <strong>{agent.matricule_agent}</strong>
        </div>
        {error && <div className="alert alert-error">⚠ {error}</div>}
        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">Rôle web</label>
            <select className="form-input" value={role_web} onChange={e => setRoleWeb(e.target.value)}>
              <option value="direction">Direction</option>
              <option value="controleur">Contrôleur des recettes</option>
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn" onClick={handleSubmit} disabled={loading}>{loading ? 'Enregistrement...' : '✓ Confirmer'}</button>
        </div>
      </div>
    </div>
  );
}

export default function GestionRoles() {
  const [agents, setAgents] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [agentsRes, usersRes] = await Promise.all([
        axios.get(`${API}/agents`),
        axios.get(`${API}/utilisateurs_web`)
      ]);
      setAgents(agentsRes.data.agents || []);
      setUtilisateurs(usersRes.data.data || []);
    } catch {}
  };

  const getRoleWeb = (matricule) => utilisateurs.find(u => u.matricule_agent === matricule);

  const handleDelete = async (matricule) => {
    try {
      await axios.delete(`${API}/utilisateurs_web/${matricule}`);
      setMessage({ text: 'Rôle supprimé avec succès.', type: 'success' });
      fetchAll();
    } catch {
      setMessage({ text: 'Erreur de connexion.', type: 'error' });
    }
  };

  const filtered = agents.filter(a =>
    ['controleur', 'informatique', 'direction','agent'].includes(a.role) && (
    String(a.matricule_agent).includes(search) ||
    (a.nom || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.prenom || '').toLowerCase().includes(search.toLowerCase())
  )
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedAgents = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div>
      <Notification message={message} onDone={() => setMessage({ text: '', type: '' })} />

      {selectedAgent && (
        <ModalRole
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onSuccess={() => { 
            setMessage({ text: 'Rôle défini avec succès.', type: 'success' }); 
            fetchAll(); 
          }}
        />
      )}

      <div className="breadcrumb">SRTB › Informatique › <span>Gestion des rôles</span></div>
      <div className="page-header">
        <div>
          <div className="page-title">Gestion des rôles web</div>
          <div className="page-subtitle">{utilisateurs.length} utilisateur(s) avec rôle défini</div>
        </div>
      </div>

      <div className="card">
        <input
          className="search-input"
          placeholder="Rechercher par matricule, nom ou prénom..."
          value={search}
          onChange={handleSearch}
        />
        <table className="data-table">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Rôle actuel</th>
              <th>Rôle web</th>
              <th>Date attribution</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAgents.map(agent => {
              const userWeb = getRoleWeb(agent.matricule_agent);
              // Ne pas afficher le bouton "Définir rôle" si l'agent a déjà le rôle informatique
              const estInformatique = userWeb?.role_web === 'informatique';
              return (
                <tr key={agent.matricule_agent}>
                  <td><span className="badge-matricule">{agent.matricule_agent}</span></td>
                  <td>{agent.nom}</td>
                  <td>{agent.prenom}</td>
                  <td><span className={`badge-role ${agent.role}`}>{agent.role}</span></td>
                  <td>
                    {userWeb
                      ? <span className={`badge-role ${roleColors[userWeb.role_web]}`}>{roleLabels[userWeb.role_web]}</span>
                      : <span style={{ color: '#8A94A6' }}>Non défini</span>
                    }
                  </td>
                  <td>{userWeb ? formatDateOnly(userWeb.date_attribution) : '—'}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    {!estInformatique && (
                      <button className="action-btn edit" onClick={() => setSelectedAgent(agent)}>Définir rôle</button>
                    )}
                    {userWeb && !estInformatique && (
                      <button className="action-btn delete" onClick={() => handleDelete(agent.matricule_agent)}>Retirer</button>
                    )}
                    {estInformatique && (
                      <span style={{ color: '#8A94A6', fontSize: '0.8rem', alignSelf: 'center' }}>— protégé —</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr className="empty-row"><td colSpan={7}>Aucun agent trouvé</td></tr>
            )}
          </tbody>
        </table>

        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
        />
      </div>
    </div>
  );
}