import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/global.css";
import useRecettesFilter from "../hooks/useRecettesFilter";

const API = "http://localhost:5000/api";
const toDT = (v) => (v ? Number(v) / 1000 : 0);
const SEARCH_FIELDS = ["nom_ligne", "id_ligne", "nom", "prenom", "matricule_agent", "id_ticket", "point_depart", "point_arrivee"];

export default function RecettesJournal() {
  const [journal, setJournal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/journal_ventes`)
      .then((res) => setJournal(res.data.data || []))
      .catch(() => setJournal([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useRecettesFilter(
    journal,
    dateFilter,
    search,
    "date_heure",
    SEARCH_FIELDS
  );

  const totalMontant = filtered.reduce((acc, j) => acc + toDT(j.montant_total), 0);

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-title">📒 Journal des ventes</div>
        <div className="receveur-empty">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-title">📒 Journal des ventes</div>

      <div className="filters-bar">
        <input
          className="search-input"
          placeholder="Rechercher par receveur, ligne, arrêt…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="date"
          className="form-input"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        {(search || dateFilter) && (
          <button
            className="btn-clear"
            onClick={() => { setSearch(""); setDateFilter(""); }}
          >
            ✕ Effacer
          </button>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="summary-strip">
          <span><strong>{filtered.length}</strong> ticket{filtered.length > 1 ? "s" : ""}</span>
          <span className="summary-sep">•</span>
          <span>Total : <strong>{totalMontant.toLocaleString("fr-FR")} DT</strong></span>
          {search && (
            <>
              <span className="summary-sep">•</span>
              <span className="summary-filter">Filtre : « {search} »</span>
            </>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="receveur-empty">
          {search || dateFilter ? "Aucun ticket ne correspond à votre recherche" : "Aucun ticket trouvé"}
        </div>
      ) : (
        <table className="recettes-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Receveur</th>
              <th>Ligne</th>
              <th>Date</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((j) => (
              <tr key={j.id_ticket}>
                <td><span className="badge-matricule">{j.id_ticket}</span></td>
                <td>{j.nom} {j.prenom}</td>
                <td>{j.nom_ligne}</td>
                <td>{j.date_heure ? new Date(j.date_heure).toLocaleString("fr-FR") : "—"}</td>
                <td><span className="badge-role direction">{toDT(j.montant_total).toLocaleString("fr-FR")} DT</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}