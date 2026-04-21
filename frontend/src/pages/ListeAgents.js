import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pagination from '../components/Pagination';
import '../styles/global.css';

const API = 'http://localhost:5000/api';
const ITEMS_PER_PAGE = 10;

export default function ListeAgents() {
  const [agents,       setAgents]       = useState([]);
  const [search,       setSearch]       = useState('');
  const [message,      setMessage]      = useState({ text: '', type: '' });
  const [currentPage,  setCurrentPage]  = useState(1);

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    try {
      const res = await axios.get(`${API}/agents`);
      setAgents(res.data.agents);
      setCurrentPage(1);
    } catch {
      setMessage({ text: 'Erreur de connexion au serveur.', type: 'error' });
    }
  };

  const filtered = agents.filter(a =>
    String(a.matricule_agent).includes(search) ||
    a.nom.toLowerCase().includes(search.toLowerCase()) ||
    a.prenom.toLowerCase().includes(search.toLowerCase()) ||
    (a.role || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages  = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIdx    = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated   = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  return (
    <div>
      <div className="breadcrumb">SRTB › Direction › <span>Liste des employés</span></div>
      <div className="page-header">
        <div>
          <div className="page-title">Liste des employés</div>
          <div className="page-subtitle">{agents.length} agent(s) enregistré(s)</div>
        </div>
      </div>

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          ⚠ {message.text}
        </div>
      )}

      <div className="card">
        <input
          className="search-input"
          placeholder="Rechercher par matricule, nom, prénom ou rôle..."
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
        />

        <table className="data-table">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Date naissance</th>
              <th>Code agence</th>
              <th>Direction</th>
              <th>Rôle</th>
              <th>statut</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(agent => (
              <tr key={agent.matricule_agent}>
                <td><span className="badge-matricule">{agent.matricule_agent}</span></td>
                <td>{agent.nom}</td>
                <td>{agent.prenom}</td>
                <td>{agent.date_naissance || '—'}</td>
                <td>{agent.code_agence || '—'}</td>
                <td>{agent.direction || '—'}</td>
                <td><span className={`badge-role ${agent.role}`}>{agent.role}</span></td>
                <td>{agent.statut || '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr className="empty-row">
                <td colSpan={7}>Aucun agent trouvé</td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

        {filtered.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border-tertiary)', fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            {startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, filtered.length)} sur {filtered.length} agent(s)
          </div>
        )}
      </div>
    </div>
  );
}