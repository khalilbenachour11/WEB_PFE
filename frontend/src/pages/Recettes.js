import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import '../styles/global.css';

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

export default function Recettes() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/recettes`).then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const exportAll = () => {
    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.aoa_to_sheet([
      ['Matricule', 'Prénom', 'Nom', 'Total (DT)'],
      ...data.parReceveur.map(r => [r.matricule_agent, r.prenom, r.nom, Number(r.total)])
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Par Receveur');

    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Ligne', 'Total (DT)'],
      ...data.parLigne.map(l => [l.nom_ligne, Number(l.total)])
    ]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Par Ligne');

    const ws3 = XLSX.utils.aoa_to_sheet([
      ['Date', 'Total (DT)'],
      ...data.parDate.map(d => [new Date(d.date).toLocaleDateString('fr-FR'), Number(d.total)])
    ]);
    XLSX.utils.book_append_sheet(wb, ws3, 'Par Date');

    XLSX.writeFile(wb, 'recettes.xlsx');
  };

  if (loading) return <div className="page-container">Chargement...</div>;

  return (
    <div>
      <div className="breadcrumb">SRTB › <span>Recettes</span></div>
      <div className="page-header">
        <div className="page-title">Recettes</div>
        <div className="page-subtitle">Statistiques des recettes</div>
      </div>

      {/* Total Global */}
      <div className="recettes-total-card">
        <div className="recettes-total-info">
          <div className="recettes-total-label">Recettes Total Global</div>
          <div className="recettes-total-amount">
            {Number(data?.total_global || 0).toLocaleString('fr-FR')} DT
          </div>
        </div>
      </div>

      <div className="recettes-grid">

        {/* Par Receveur */}
        <div className="recettes-card">
          <div className="recettes-card-header">
            <div className="recettes-card-title">Recettes par Receveur</div>
          </div>
          <table className="recettes-table">
            <thead>
              <tr>
                <th>Receveur</th>
                <th>Matricule</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {data?.parReceveur?.map(r => (
                <tr key={r.matricule_agent}>
                  <td>{r.prenom} {r.nom}</td>
                  <td>{r.matricule_agent}</td>
                  <td><span className="montant-badge">{Number(r.total).toLocaleString('fr-FR')} DT</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Par Ligne */}
        <div className="recettes-card">
          <div className="recettes-card-header">
            <div className="recettes-card-title"> Recettes par Ligne</div>
          </div>
          <table className="recettes-table">
            <thead>
              <tr>
                <th>Ligne</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {data?.parLigne?.map(l => (
                <tr key={l.id_ligne}>
                  <td>{l.nom_ligne}</td>
                  <td><span className="montant-badge">{Number(l.total).toLocaleString('fr-FR')} DT</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Par Date */}
      <div className="recettes-card" style={{ marginBottom: 24 }}>
        <div className="recettes-card-header">
          <div className="recettes-card-title"> Recettes par Date (30 derniers jours)</div>
        </div>
        <table className="recettes-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {data?.parDate?.map(d => (
              <tr key={d.date}>
                <td>{formatDateOnly(d.date)}</td>
                <td><span className="montant-badge">{Number(d.total).toLocaleString('fr-FR')} DT</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export */}
      <div className="export-section">
        <button className="btn-export" onClick={exportAll}>
          ⬇ Exporter Rapport Excel
        </button>
      </div>
    </div>
  );
}