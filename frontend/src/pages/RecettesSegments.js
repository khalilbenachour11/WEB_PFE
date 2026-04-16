import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/global.css";
import useRecettesFilter from "../hooks/useRecettesFilter";

const API = "http://localhost:5000/api";
const toDT = (v) => (v ? Number(v) / 1000 : 0);
const SEARCH_FIELDS = [
  "nom_ligne",
  "id_ligne",
  "point_depart",
  "point_arrivee",
  "id_segment",
  "id_voyage",
];

export default function RecettesSegments() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/recettes_segment`)
      .then((res) => setSegments(res.data.data || []))
      .catch(() => setSegments([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useRecettesFilter(
    segments,
    dateFilter,
    search,
    "date_heure",
    SEARCH_FIELDS,
  );

  const totalRecette = filtered.reduce(
    (acc, s) => acc + toDT(s.total_recette),
    0,
  );

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-title">🧭 Recettes segments</div>
        <div className="receveur-empty">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-title">🧭 Recettes segments</div>

      <div className="filters-bar">
        <input
          className="search-input"
          placeholder="Rechercher par ligne, arrêt départ, arrêt arrivée…"
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
            onClick={() => {
              setSearch("");
              setDateFilter("");
            }}
          >
            ✕ Effacer
          </button>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="summary-strip">
          <span>
            <strong>{filtered.length}</strong> segment
            {filtered.length > 1 ? "s" : ""}
          </span>
          <span className="summary-sep">•</span>
          <span>
            Total : <strong>{totalRecette.toLocaleString("fr-FR")} DT</strong>
          </span>
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
          {search || dateFilter
            ? "Aucun segment ne correspond à votre recherche"
            : "Aucun segment trouvé"}
        </div>
      ) : (
        <table className="recettes-table">
          <thead>
            <tr>
              <th>Segment</th>
              <th>Voyage</th>
              <th>Départ</th>
              <th>Arrivée</th>
              <th>Recette</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id_segment}>
                <td>{s.id_segment}</td>
                <td>
                  <span className="badge-matricule">{s.id_voyage}</span>
                </td>
                <td>{s.point_depart}</td>
                <td>{s.point_arrivee}</td>
                <td>
                  <span className="badge-role direction">
                    {toDT(s.total_recette).toLocaleString("fr-FR")} DT
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
