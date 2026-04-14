import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/global.css';
import Pagination from '../components/Pagination';
import Notification from '../components/Notification';

const API = 'http://localhost:5000/api';

const validerMotDePasse = (mdp) => {
  if (mdp.length < 8)           return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (!/[A-Z]/.test(mdp))       return 'Le mot de passe doit contenir au moins une majuscule.';
  if (!/[0-9]/.test(mdp))       return 'Le mot de passe doit contenir au moins un chiffre.';
  if (!/[!@#$%^&*]/.test(mdp))  return 'Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*).';
  return null;
};

const getForce = (mdp) => {
  if (mdp.length === 0) return null;
  let score = 0;
  if (mdp.length >= 8)         score++;
  if (/[A-Z]/.test(mdp))       score++;
  if (/[0-9]/.test(mdp))       score++;
  if (/[!@#$%^&*]/.test(mdp))  score++;
  if (score <= 1) return { label: 'Faible', classe: 'force-faible', width: '25%' };
  if (score === 2) return { label: 'Moyen',  classe: 'force-moyen',  width: '50%' };
  if (score === 3) return { label: 'Bon',    classe: 'force-bon',    width: '75%' };
  return             { label: 'Fort',    classe: 'force-fort',   width: '100%' };
};

function ModalMdp({ agent, onClose, onSuccess }) {
  const [mdp, setMdp]         = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const isAjout = !agent.has_password;
  const force   = getForce(mdp);

  const handleSubmit = async () => {
    if (!mdp || mdp.trim() === '') { setError('Veuillez entrer un mot de passe.'); return; }
    const erreurComplexite = validerMotDePasse(mdp);
    if (erreurComplexite) { setError(erreurComplexite); return; }
    if (mdp !== confirm)  { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      const res = await axios.put(`${API}/modifier_mdp/${agent.matricule_agent}`, { mot_de_passe: mdp });
      if (res.data.success) { onSuccess(isAjout); onClose(); }
      else setError(res.data.message);
    } catch { setError('Erreur de connexion au serveur.'); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-icon">{isAjout ? '➕' : '🔑'}</div>

        <div className="modal-title">
          {isAjout ? 'Ajouter un mot de passe' : 'Modifier le mot de passe'}
        </div>

        <div className="modal-message">
          Agent : <strong>{agent.prenom} {agent.nom}</strong>
          <br />Matricule : <strong>{agent.matricule_agent}</strong>
        </div>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">Nouveau mot de passe</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={mdp}
              onChange={e => { setMdp(e.target.value); setError(''); }}
            />
            {force && (
              <div className="mdp-force-wrapper">
                <div className="mdp-force-bar">
                  <div className={`mdp-force-fill ${force.classe}`} style={{ width: force.width }} />
                </div>
                <div className={`mdp-force-label ${force.classe}`}>Force : {force.label}</div>
              </div>
            )}
            <div className="mdp-criteres">
              <div className={mdp.length >= 8      ? 'critere-ok' : 'critere-ko'}>{mdp.length >= 8      ? '✓' : '✗'} Au moins 8 caractères</div>
              <div className={/[A-Z]/.test(mdp)    ? 'critere-ok' : 'critere-ko'}>{/[A-Z]/.test(mdp)    ? '✓' : '✗'} Au moins une majuscule</div>
              <div className={/[0-9]/.test(mdp)    ? 'critere-ok' : 'critere-ko'}>{/[0-9]/.test(mdp)    ? '✓' : '✗'} Au moins un chiffre</div>
              <div className={/[!@#$%^&*]/.test(mdp) ? 'critere-ok' : 'critere-ko'}>{/[!@#$%^&*]/.test(mdp) ? '✓' : '✗'} Au moins un caractère spécial (!@#$%^&*)</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirmer le mot de passe</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(''); }}
            />
            {confirm && (
              <div className={mdp === confirm ? 'critere-ok' : 'critere-ko'}>
                {mdp === confirm ? '✓ Les mots de passe correspondent' : '✗ Les mots de passe ne correspondent pas'}
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn" onClick={handleSubmit} disabled={loading}>
            {loading
              ? (isAjout ? 'Ajout...' : 'Modification...')
              : (isAjout ? "➕ Confirmer l'ajout" : '✓ Confirmer la modification')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GestionMdp() {
  const [agents, setAgents]               = useState([]);
  const [search, setSearch]               = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [message, setMessage]             = useState({ text: '', type: '' });
  const [currentPage, setCurrentPage]     = useState(1);

  const itemsPerPage = 10;

  useEffect(() => { fetchAgents(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search]);

  const fetchAgents = async () => {
    try {
      const res = await axios.get(`${API}/agents`);
      setAgents(res.data.agents);
    } catch {
      setMessage({ text: 'Erreur de connexion au serveur.', type: 'error' });
    }
  };

  const handleSuccess = (isAjout) => {
    setMessage({
      text: isAjout ? 'Mot de passe ajouté avec succès.' : 'Mot de passe modifié avec succès.',
      type: 'success',
    });
    fetchAgents();
  };

 const filtered = agents.filter(a =>
    a.role === 'receveur' && (
      String(a.matricule_agent).includes(search) ||
      a.nom.toLowerCase().includes(search.toLowerCase()) ||
      a.prenom.toLowerCase().includes(search.toLowerCase())
    )
  );

  const indexOfLastItem  = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems     = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages       = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div>
      <Notification message={message} onDone={() => setMessage({ text: '', type: '' })} />

      {selectedAgent && (
        <ModalMdp
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onSuccess={handleSuccess}
        />
      )}

      <div className="breadcrumb">SRTB › <span>Gestion des mots de passe</span></div>

      <div className="page-header">
        <div>
          <div className="page-title">Gestion des mots de passe</div>
          <div className="page-subtitle">
            {filtered.length} agent(s) filtré(s) sur {agents.length} au total
          </div>
        </div>
      </div>

      <div className="card">
        <input
          className="search-input"
          placeholder="Rechercher par matricule, nom ou prénom..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <table className="data-table">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Rôle</th>
              <th>Statut MDP</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map(agent => (
              <tr key={agent.matricule_agent}>
                <td><span className="badge-matricule">{agent.matricule_agent}</span></td>
                <td>{agent.nom}</td>
                <td>{agent.prenom}</td>
                <td><span className={`badge-role ${agent.role}`}>{agent.role}</span></td>
                <td>
                  {agent.has_password
                    ? <span className="badge-role informatique">✓ Défini</span>
                    : <span className="badge-role" style={{ background: '#fef3c7', color: '#92400e' }}>✗ Non défini</span>
                  }
                </td>
                <td>
                  <button
                    className={`action-btn ${agent.has_password ? 'edit' : 'add'}`}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    {agent.has_password ? 'Modifier MDP' : '➕ Ajouter MDP'}
                  </button>
                </td>
              </tr>
            ))}
            {currentItems.length === 0 && (
              <tr className="empty-row"><td colSpan={6}>Aucun agent trouvé</td></tr>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '1px solid var(--color-border-tertiary)' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </div>
    </div>
  );
}