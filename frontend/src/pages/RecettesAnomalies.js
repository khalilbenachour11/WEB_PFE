import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/global.css";
import useRecettesFilter from "../hooks/useRecettesFilter";

const API = "http://localhost:5000/api";
const toDT = (v) => (v ? Number(v) / 1000 : 0);
const SEARCH_FIELDS = ["nom_ligne", "id_ligne", "id_voyage"];

export default function RecettesAnomalies() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/anomalies_recettes`)
      .then((res) => setAnomalies(res.data.data || []))
      .catch(() => setAnomalies([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useRecettesFilter(
    anomalies,
    dateFilter,
    search,
    "date_heure",
    SEARCH_FIELDS,
  );

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-title">⚠️ Anomalies de recettes</div>
        <div className="receveur-empty">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-title">⚠️ Anomalies de recettes</div>

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
            <strong>{filtered.length}</strong> anomalie
            {filtered.length > 1 ? "s" : ""}
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
            ? "Aucune anomalie ne correspond à votre recherche"
            : "Aucune anomalie trouvée"}
        </div>
      ) : (
        <table className="recettes-table">
          <thead>
            <tr>
              <th>Voyage</th>
              <th>Ligne</th>
              <th>Écart</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id_voyage}>
                <td>
                  <span className="badge-matricule">{a.id_voyage}</span>
                </td>
                <td>{a.nom_ligne}</td>
                <td style={{ color: "red", fontWeight: "bold" }}>
                  {toDT(a.ecart).toLocaleString("fr-FR")} DT
                </td>
                <td>
                  {a.date_heure
                    ? new Date(a.date_heure).toLocaleString("fr-FR")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
