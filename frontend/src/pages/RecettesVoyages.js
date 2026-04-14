import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/global.css";
import useRecettesFilter from "../hooks/useRecettesFilter";

const API = "http://localhost:5000/api";
const toDT = (value) => (value ? Number(value) / 1000 : 0);
const SEARCH_FIELDS = ["nom_ligne", "id_ligne", "id_vente"];

export default function RecettesVoyages() {
  const [voyages, setVoyages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/recettes_voyage`)
      .then((res) => setVoyages(res.data.data || []))
      .catch(() => setVoyages([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredVoyages = useRecettesFilter(
    voyages,
    dateFilter,
    search,
    "date_heure",
    SEARCH_FIELDS
  );

  const totalRecette = filteredVoyages.reduce(
    (acc, v) => acc + toDT(v.total_recette),
    0
  );

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-title">🚆 Recettes par voyages</div>
        <div className="receveur-empty">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-title">🚆 Recettes par voyages</div>

      <div className="filters-bar">
        <input
          className="search-input"
          placeholder="Rechercher par ligne, numéro de voyage…"
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

      {filteredVoyages.length > 0 && (
        <div className="summary-strip">
          <span><strong>{filteredVoyages.length}</strong> voyage{filteredVoyages.length > 1 ? "s" : ""}</span>
          <span className="summary-sep">•</span>
          <span>Total : <strong>{totalRecette.toLocaleString("fr-FR")} DT</strong></span>
          {search && (
            <>
              <span className="summary-sep">•</span>
              <span className="summary-filter">Filtre : « {search} »</span>
            </>
          )}
        </div>
      )}

      {filteredVoyages.length === 0 ? (
        <div className="receveur-empty">
          {search || dateFilter ? "Aucun voyage ne correspond à votre recherche" : "Aucune recette trouvée"}
        </div>
      ) : (
        <table className="recettes-table">
          <thead>
            <tr>
              <th>Voyage</th>
              <th>Ligne</th>
              <th>Date</th>
              <th>Recette (DT)</th>
            </tr>
          </thead>
          <tbody>
            {filteredVoyages.map((v) => (
              <tr key={v.id_vente}>
                <td><span className="badge-matricule">{v.id_vente}</span></td>
                <td>{v.nom_ligne || `Ligne ${v.id_ligne}`}</td>
                <td>{v.date_heure ? new Date(v.date_heure).toLocaleString("fr-FR") : "—"}</td>
                <td><span className="badge-role direction">{toDT(v.total_recette).toLocaleString("fr-FR")} DT</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}