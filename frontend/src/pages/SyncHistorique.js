import React, { useEffect, useState } from "react";
import axios from "axios";
import useRecettesFilter from "../hooks/useRecettesFilter";

const API = "http://localhost:5000/api";
const toDT = (v) => (v ? Number(v) / 1000 : 0);
const SEARCH_FIELDS = [
  "nom_ligne",
  "id_ligne",
  "id_vente",
  "id_ticket",
  "nom",
  "prenom",
  "point_depart",
  "point_arrivee",
];

export default function SyncHistorique() {
  const [allTickets, setAllTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("online");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  // Catégories de tickets
  const onlineTickets = allTickets.filter((t) => t.statut_sync === "online");
  const syncedOfflineTickets = allTickets.filter(
    (t) => t.statut_sync === "synced"
  );
  const failedTickets = allTickets.filter((t) => t.statut_sync === "failed");

  // Appliquer les filtres selon l'onglet actif
  const getCurrentTabTickets = () => {
    switch (activeTab) {
      case "online":
        return onlineTickets;
      case "synced":
        return syncedOfflineTickets;
      case "failed":
        return failedTickets;
      default:
        return [];
    }
  };

  const filtered = useRecettesFilter(
    getCurrentTabTickets(),
    dateFilter,
    search,
    "date_heure",
    SEARCH_FIELDS
  );

  const totalMontant = filtered.reduce(
    (acc, t) => acc + toDT(t.montant_total),
    0
  );

  // ─────────────────────────────────────────────────────────
  // Chargement des données
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    _fetchAll();
  }, []);

  const _fetchAll = async () => {
    setLoading(true);
    setSyncMessage(null);
    try {
      // Charger les tickets avec statut de sync
      const ticketsRes = await axios.get(`${API}/tickets_sync_history`);
      setAllTickets(ticketsRes.data.data || []);

      // Charger les stats
      const statsRes = await axios.get(`${API}/tickets_sync_stats`);
      setStats(statsRes.data.data || null);
    } catch (err) {
      console.error("Erreur lors du chargement:", err);
      setAllTickets([]);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Retry synchronisation
  // ─────────────────────────────────────────────────────────

  const _retrySync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await axios.post(`${API}/retry_sync`);
      const { synced, failed } = res.data.result;
      setSyncMessage(
        `✓ ${synced} synchronisé${synced > 1 ? "s" : ""}   ✗ ${failed} échoué${failed > 1 ? "s" : ""}`
      );
      await _fetchAll();
    } catch (err) {
      setSyncMessage("⚠️ Erreur lors de la synchronisation");
    } finally {
      setIsSyncing(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Rendus
  // ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">🔄 Historique de synchronisation</div>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "60px" }}>
          <p style={{ color: "var(--gray-400)" }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ─── PAGE HEADER ─── */}
      <div className="page-header">
        <div>
          <div className="page-title">🔄 Historique de synchronisation</div>
          <p className="page-subtitle">
            Consultez l'état de synchronisation des tickets avec le serveur
          </p>
        </div>
      </div>

      {/* ─── STATISTIQUES ─── */}
      {stats && (
        <div className="dashboard-cards">
          <div className="dashboard-card blue">
            <div className="card-icon-wrap">📡</div>
            <div className="card-number">{onlineTickets.length}</div>
            <div className="card-label">En ligne</div>
          </div>
          <div className="dashboard-card gold">
            <div className="card-icon-wrap">☁️</div>
            <div className="card-number">{syncedOfflineTickets.length}</div>
            <div className="card-label">Synchronisés offline</div>
          </div>
          <div className="dashboard-card">
            <div className="card-icon-wrap">⚠️</div>
            <div className="card-number">{failedTickets.length}</div>
            <div className="card-label">Échoués</div>
          </div>
          <div className="dashboard-card green">
            <div className="card-icon-wrap">💰</div>
            <div className="card-number">
              {toDT(stats.montant_total_synced).toLocaleString("fr-FR")}
            </div>
            <div className="card-label">Montant total (DT)</div>
          </div>
        </div>
      )}

      {/* ─── MESSAGE DE SYNC ─── */}
      {syncMessage && (
        <div className="alert alert-success" style={{ marginBottom: "20px" }}>
          <span>{syncMessage}</span>
        </div>
      )}

      {/* ─── CARD PRINCIPALE ─── */}
      <div className="card">
        {/* ─── ONGLETS ─── */}
        <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--gray-200)", paddingBottom: "16px" }}>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <button
              className={`btn ${activeTab === "online" ? "btn-gold" : "btn-gray"}`}
              onClick={() => setActiveTab("online")}
              style={{ borderRadius: "6px" }}
            >
              📡 En ligne ({onlineTickets.length})
            </button>
            <button
              className={`btn ${activeTab === "synced" ? "btn-gold" : "btn-gray"}`}
              onClick={() => setActiveTab("synced")}
              style={{ borderRadius: "6px" }}
            >
              ☁️ Sync offline ({syncedOfflineTickets.length})
            </button>
            <button
              className={`btn ${activeTab === "failed" ? "btn-gold" : "btn-gray"}`}
              onClick={() => setActiveTab("failed")}
              style={{ borderRadius: "6px" }}
            >
              ⚠️ Échoués ({failedTickets.length})
            </button>
          </div>
        </div>

        {/* ─── FILTRES ─── */}
        <div className="filters-bar">
          <input
            className="search-input"
            placeholder="Rechercher par ligne, receveur, arrêt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            type="date"
            className="form-input"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ maxWidth: "200px" }}
          />
          {(search || dateFilter) && (
            <button
              className="btn btn-gray"
              onClick={() => {
                setSearch("");
                setDateFilter("");
              }}
            >
              ✕ Effacer
            </button>
          )}
          <button
            className="btn btn-gold"
            onClick={_retrySync}
            disabled={isSyncing}
            style={{ marginLeft: "auto" }}
          >
            {isSyncing ? "⏳ Synchronisation..." : "🔄 Réessayer"}
          </button>
        </div>

        {/* ─── RÉSUMÉ ─── */}
        {filtered.length > 0 && (
          <div
            style={{
              marginBottom: "20px",
              padding: "12px 16px",
              background: "var(--gray-100)",
              borderRadius: "8px",
              fontSize: "0.85rem",
              color: "var(--gray-600)",
              fontWeight: "500",
            }}
          >
            <strong>{filtered.length}</strong> ticket
            {filtered.length > 1 ? "s" : ""} •{" "}
            <strong>{totalMontant.toLocaleString("fr-FR")} DT</strong>
            {search && (
              <>
                {" "}
                • Filtre : « <strong>{search}</strong> »
              </>
            )}
          </div>
        )}

        {/* ─── CONTENU ─── */}
        {filtered.length === 0 ? (
          <div className="empty-row">
            <div style={{ padding: "40px 0" }}>
              {search || dateFilter
                ? "❌ Aucun ticket ne correspond à votre recherche"
                : `ℹ️ Aucun ticket ${
                    activeTab === "online"
                      ? "en ligne"
                      : activeTab === "synced"
                      ? "synchronisé hors-ligne"
                      : "échoué"
                  }`}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            {/* Bouton Réessayer pour l'onglet échoués */}
            {activeTab === "failed" && failedTickets.length > 0 && (
              <button
                className="btn btn-gold btn-full"
                onClick={_retrySync}
                disabled={isSyncing}
                style={{ marginBottom: "20px" }}
              >
                {isSyncing
                  ? "⏳ Réessai en cours..."
                  : "🔄 Réessayer la synchronisation"}
              </button>
            )}

            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Receveur</th>
                  <th>Ligne</th>
                  <th>Route</th>
                  <th>Date/Heure</th>
                  <th>Montant (DT)</th>
                  <th>Statut</th>
                  {activeTab === "failed" && <th>Erreur</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id_ticket}>
                    <td>
                      <span className="badge-matricule">{t.id_ticket}</span>
                    </td>
                    <td>
                      {t.nom} {t.prenom}
                    </td>
                    <td>{t.nom_ligne || "—"}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          background: "var(--gray-100)",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                        }}
                      >
                        {t.point_depart} → {t.point_arrivee}
                      </span>
                    </td>
                    <td>
                      {t.date_heure
                        ? new Date(t.date_heure).toLocaleString("fr-FR")
                        : "—"}
                    </td>
                    <td>
                      <span
                        className="badge-role"
                        style={{
                          background: "rgba(27,107,58,0.1)",
                          color: "var(--green)",
                        }}
                      >
                        {toDT(t.montant_total).toLocaleString("fr-FR")}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge-role"
                        style={{
                          background:
                            t.statut_sync === "online"
                              ? "rgba(27,107,58,0.1)"
                              : t.statut_sync === "synced"
                              ? "rgba(13,43,94,0.1)"
                              : "rgba(192,57,43,0.1)",
                          color:
                            t.statut_sync === "online"
                              ? "var(--green)"
                              : t.statut_sync === "synced"
                              ? "var(--navy)"
                              : "var(--red)",
                        }}
                      >
                        {t.statut_sync === "online" && "📡 En ligne"}
                        {t.statut_sync === "synced" && "☁️ Synchronisé"}
                        {t.statut_sync === "failed" && "⚠️ Échoué"}
                      </span>
                    </td>
                    {activeTab === "failed" && (
                      <td style={{ color: "var(--red)", fontSize: "0.85rem" }}>
                        {t.erreur || "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}