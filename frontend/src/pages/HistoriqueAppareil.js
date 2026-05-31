import React, { useState, useEffect } from "react";
import "../styles/global.css";
import Pagination from "../components/Pagination";
import axios from "../api/axios";

const formatDateOnly = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Couleur du badge selon le statut
const statutColor = (statut) => {
  if (!statut) return { bg: "#f0f0f0", color: "#888", border: "#ccc" };
  if (statut === "actif")
    return { bg: "rgba(27,107,58,0.1)", color: "#1B6B3A", border: "rgba(27,107,58,0.3)" };
  if (statut === "en panne")
    return { bg: "rgba(190,56,23,0.1)", color: "#be3817", border: "rgba(190,56,23,0.3)" };
  if (statut === "en stocke")
    return { bg: "rgba(13,43,94,0.08)", color: "#0D2B5E", border: "rgba(13,43,94,0.2)" };
  return { bg: "#f0f0f0", color: "#666", border: "#ccc" };
};

function StatutBadge({ statut }) {
  if (!statut) return <span style={{ color: "#8A94A6" }}>—</span>;
  const { bg, color, border } = statutColor(statut);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: "0.75rem",
        fontWeight: 700,
        background: bg,
        color,
        border: `1px solid ${border}`,
        whiteSpace: "nowrap",
      }}
    >
      {statut === "actif" && "🟢 "}
      {statut === "en panne" && "🔴 "}
      {statut === "en stocke" && "⚪"}
      {statut}
    </span>
  );
}

function TransitionStatut({ avant, apres }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {avant ? (
        <StatutBadge statut={avant} />
      ) : (
        <span style={{ fontSize: "0.72rem", color: "#8A94A6", fontStyle: "italic" }}>
          initial
        </span>
      )}
      <span style={{ color: "#8A94A6", fontSize: "0.9rem" }}>→</span>
      <StatutBadge statut={apres} />
    </div>
  );
}

export default function HistoriqueAppareil() {
  const [historique, setHistorique] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchHistorique();
  }, []);

  const fetchHistorique = async () => {
    try {
      const res = await axios.get(`/historique_appareils`);
      setHistorique(res.data.historique || []);
    } catch {
      setMessage({ text: "Erreur de connexion au serveur.", type: "error" });
      setHistorique([]);
    }
  };

  const filtered = (historique || []).filter(
    (h) =>
      String(h.num_serie).includes(search) ||
      (h.nom || "").toLowerCase().includes(search.toLowerCase()) ||
      (h.prenom || "").toLowerCase().includes(search.toLowerCase()) ||
      String(h.matricule_agent).includes(search) ||
      (h.statut_avant || "").toLowerCase().includes(search.toLowerCase()) ||
      (h.statut_apres || "").toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div>
      <div className="breadcrumb">
        SRTB › Direction › <span>Historique attributions</span>
      </div>
      <div className="page-header">
        <div>
          <div className="page-title">Historique des attributions</div>
          <div className="page-subtitle">
            {historique.length} attribution(s) enregistrée(s)
          </div>
        </div>
      </div>

      {message.text && (
        <div className="alert alert-error">⚠ {message.text}</div>
      )}

      <div className="card">
        <input
          className="search-input"
          placeholder="Rechercher par numéro série, agent, statut..."
          value={search}
          onChange={handleSearchChange}
        />

        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>N° Série</th>
                <th>Agent</th>
                <th>Matricule</th>
                <th>Date attribution</th>
                <th>Date retour</th>
                <th>Changement de statut</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((h, i) => (
                  <tr key={i}>
                    <td>
                      <span className="badge-matricule">
                        {indexOfFirstItem + i + 1}
                      </span>
                    </td>
                    <td>
                      <span className="badge-matricule">{h.num_serie}</span>
                    </td>
                    <td>
                      {h.prenom} {h.nom}
                    </td>
                    <td>
                      <span className="badge-matricule">
                        {h.matricule_agent || "—"}
                      </span>
                    </td>
                    <td>{formatDateOnly(h.date_attribution)}</td>
                    <td>
                      {h.date_retour ? (
                        formatDateOnly(h.date_retour)
                      ) : (
                        <span style={{ color: "#1B6B3A", fontWeight: 600 }}>
                          En cours
                        </span>
                      )}
                    </td>
                    <td>
                      <TransitionStatut
                        avant={h.statut_avant}
                        apres={h.statut_apres}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="empty-row">
                  <td colSpan={7}>Aucun historique trouvé</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {filtered.length > 0 && (
          <div
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              color: "var(--color-text-secondary)",
              textAlign: "center",
              borderTop: "1px solid var(--gray-100)",
            }}
          >
            {indexOfFirstItem + 1}–
            {Math.min(indexOfLastItem, filtered.length)} sur {filtered.length}{" "}
            entrée(s)
          </div>
        )}
      </div>
    </div>
  );
}