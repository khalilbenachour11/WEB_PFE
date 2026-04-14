import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/global.css';

// Import du composant Pagination (assurez-vous que le chemin est correct)
import Pagination from '../components/Pagination';

const API = 'http://localhost:5000/api';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateOnly = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export default function HistoriqueAppareil() {
  const [historique, setHistorique] = useState([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { fetchHistorique(); }, []);

  const fetchHistorique = async () => {
    try {
      const res = await axios.get(`${API}/historique_appareils`);
      setHistorique(res.data.historique || []);
    } catch {
      setMessage({ text: 'Erreur de connexion au serveur.', type: 'error' });
      setHistorique([]);
    }
  };

  const filtered = (historique || []).filter(h =>
    String(h.num_serie).includes(search) ||
    (h.nom || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.prenom || '').toLowerCase().includes(search.toLowerCase()) ||
    String(h.matricule_agent).includes(search)
  );

  // Logique de découpage pour la pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  // Réinitialiser à la page 1 lors d'une recherche
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div>
      <div className="breadcrumb">SRTB › Direction › <span>Historique attributions</span></div>
      <div className="page-header">
        <div>
          <div className="page-title">Historique des attributions</div>
          <div className="page-subtitle">{historique.length} attribution(s) enregistrée(s)</div>
        </div>
      </div>

      {message.text && (
        <div className="alert alert-error">⚠ {message.text}</div>
      )}

      <div className="card">
        <input
          className="search-input"
          placeholder="Rechercher par numéro série, agent..."
          value={search}
          onChange={handleSearchChange}
        />

        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>N° Série</th>
              <th>Agent</th>
              <th>Matricule</th>
              <th>Date attribution</th>
              <th>Date retour</th>
              <th>Date panne</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? currentItems.map((h, i) => (
              <tr key={i}>
                <td><span className="badge-matricule">{indexOfFirstItem + i + 1}</span></td>
                <td><span className="badge-matricule">{h.num_serie}</span></td>
                <td>{h.prenom} {h.nom}</td>
                <td><span className="badge-matricule">{h.matricule_agent || '—'}</span></td>
                <td>{formatDateOnly(h.date_attribution)}</td>
                <td>{h.date_retour ? formatDateOnly(h.date_retour) : <span style={{ color: '#1B6B3A', fontWeight: 600 }}>En cours</span>}</td>
                <td>{h.statut === 'en panne' && h.date_retour ? <span className="badge-role red">{formatDateOnly(h.date_retour)}</span> : 
                <span style={{ color: '#8A94A6' }}>—</span>}</td>
              </tr>
            )) : (
              <tr className="empty-row">
                <td colSpan={7}>Aucun historique trouvé</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Appel du composant Pagination */}
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
        />
      </div>
    </div>
  );
}