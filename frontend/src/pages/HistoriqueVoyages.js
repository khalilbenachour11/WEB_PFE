import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import "../styles/global.css";
import Pagination from "../components/Pagination";
import Notification from "../components/Notification";

const API = "http://localhost:5000/api";
const ITEMS_PER_PAGE = 20;

const fmtDateTime = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleString("fr-TN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
};

const STATUT_CONFIG = {
  actif:   { bg: "rgba(201,168,76,0.15)", color: "#8a6a00", border: "#c9a84c", label: "Actif",   icon: "🟡" },
  cloture: { bg: "rgba(27,107,58,0.12)",  color: "#1B6B3A", border: "#1B6B3A", label: "Clôturé", icon: "✅" },
};

const statutCfg = (s) => STATUT_CONFIG[s] || { bg: "#f0f0f0", color: "#666", border: "#ccc", label: s || "—", icon: "•" };

function StatutBadge({ statut, size = "sm" }) {
  const cfg = statutCfg(statut);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: size === "sm" ? "3px 10px" : "5px 14px",
      borderRadius: 20, fontSize: size === "sm" ? "0.75rem" : "0.85rem",
      fontWeight: 600, background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}44`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ArrowTransition({ avant, apres }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {avant ? <StatutBadge statut={avant} /> : (
        <span style={{ fontSize: "0.75rem", color: "var(--gray-400)", fontStyle: "italic" }}>création</span>
      )}
      <span style={{ color: "var(--gray-400)", fontSize: "1rem" }}>→</span>
      <StatutBadge statut={apres} />
    </div>
  );
}

// ─── Timeline d'un voyage ──────────────────────────────────────────────────
function VoyageTimeline({ idVoyage, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/voyage_historique/${idVoyage}`)
      .then((r) => setEntries(r.data.data || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [idVoyage]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 600, width: "95vw", maxHeight: "88vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">🕐 Historique complet — Voyage #{idVoyage}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: "20px 28px" }}>
          {loading ? (
            <div className="receveur-empty">Chargement...</div>
          ) : entries.length === 0 ? (
            <div className="receveur-empty">Aucune trace enregistrée pour ce voyage.</div>
          ) : (
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute", left: 19, top: 0, bottom: 0,
                width: 2, background: "var(--gray-200)", borderRadius: 2,
              }} />
              {entries.map((e, i) => {
                const cfg = statutCfg(e.statut_apres);
                const isLast = i === entries.length - 1;
                return (
                  <div key={e.id} style={{ display: "flex", gap: 16, marginBottom: isLast ? 0 : 24, position: "relative" }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                      background: cfg.bg, border: `2px solid ${cfg.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1rem", zIndex: 1,
                    }}>
                      {cfg.icon}
                    </div>
                    <div style={{
                      flex: 1, background: cfg.bg,
                      border: `1px solid ${cfg.border}33`,
                      borderRadius: 10, padding: "12px 16px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <ArrowTransition avant={e.statut_avant} apres={e.statut_apres} />
                        <span style={{ fontSize: "0.72rem", color: "var(--gray-400)", whiteSpace: "nowrap", marginLeft: 8 }}>
                          {fmtDateTime(e.created_at)}
                        </span>
                      </div>
                      {(e.nom || e.prenom) && (
                        <div style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>
                          👤 {e.prenom} {e.nom}
                        </div>
                      )}
                    
                      
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding: "16px 28px", borderTop: "1px solid var(--gray-200)", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-gray" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ─── KPI Cards ─────────────────────────────────────────────────────────────
function KpiCards({ stats }) {
  if (!stats) return null;
  const cards = [
    { label: "Total événements", value: stats.total,         color: "var(--navy)" },
    { label: "Clôtures",         value: stats.clotures,      color: "var(--green)"},
    { label: "Activations",      value: stats.activations,   color: "#c9a84c" },
    { label: "Réactivations",    value: stats.reactivations, color: "#1a73e8" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
      {cards.map((c) => (
        <div key={c.label} style={{
          background: "#fff", borderRadius: 12, padding: "18px 20px",
          border: "1px solid var(--gray-100)", boxShadow: "var(--shadow-sm)",
          borderTop: `3px solid ${c.color}`,
        }}>
          <div style={{ fontSize: "1.4rem", marginBottom: 8 }}></div>
          <div style={{ fontSize: "0.72rem", color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>
            {c.label}
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: c.color, fontFamily: "'Playfair Display', serif" }}>
            {c.value ?? "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────
export default function HistoriqueVoyages() {
  const [entries,    setEntries]    = useState([]);
  const [stats,      setStats]      = useState(null);
  const [lignesMap,  setLignesMap]  = useState({});
  const [loading,    setLoading]    = useState(true);
  const [message,    setMessage]    = useState({ text: "", type: "" });
  const [timelineId, setTimelineId] = useState(null);

  const [search,          setSearch]          = useState("");
  const [filterStatut,    setFilterStatut]    = useState("");
  const [filterLigne,     setFilterLigne]     = useState("");
  const [filterDateDebut, setFilterDateDebut] = useState("");
  const [filterDateFin,   setFilterDateFin]   = useState("");
  const [filterReceveur,  setFilterReceveur]  = useState("");

  const [sortField,   setSortField]   = useState("created_at");
  const [sortDir,     setSortDir]     = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const resetPage = useCallback(() => setCurrentPage(1), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatut)    params.statut = filterStatut;
      if (filterDateDebut) params.start  = filterDateDebut;
      if (filterDateFin)   params.end    = filterDateFin;

      const [entRes, statsRes, lignesRes] = await Promise.all([
        axios.get(`${API}/voyage_historique`, { params }),
        axios.get(`${API}/voyage_historique_stats`, { params }),
        axios.get(`${API}/lignes`),
      ]);

      setEntries(entRes.data.data || []);
      setStats(statsRes.data.stats || null);

      const lMap = {};
      (lignesRes.data.lignes || []).forEach((l) => { lMap[l.id_ligne] = l.nom_ligne; });
      setLignesMap(lMap);
    } catch {
      setMessage({ text: "Erreur de connexion au serveur.", type: "error" });
    }
    setLoading(false);
  }, [filterStatut, filterDateDebut, filterDateFin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (filterLigne && String(e.id_ligne) !== filterLigne) return false;
      if (filterReceveur) {
        const rv   = filterReceveur.toLowerCase();
        const name = `${e.prenom || ""} ${e.nom || ""}`.toLowerCase();
        if (!name.includes(rv) && !String(e.matricule_agent).includes(rv)) return false;
      }
      if (q) {
        const ligneNom = (lignesMap[e.id_ligne] || "").toLowerCase();
        const receveur = `${e.prenom || ""} ${e.nom || ""}`.toLowerCase();
        const voyId    = String(e.id_voyage);
        if (
          !ligneNom.includes(q) &&
          !receveur.includes(q) &&
          !voyId.includes(q)
        ) return false;
      }
      return true;
    });
  }, [entries, search, filterLigne, filterReceveur, lignesMap]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (sortField === "created_at") {
        va = new Date(va).getTime(); vb = new Date(vb).getTime();
      } else if (sortField === "id_voyage" || sortField === "id") {
        va = Number(va); vb = Number(vb);
      } else {
        va = String(va || "").toLowerCase(); vb = String(vb || "").toLowerCase();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const startIdx   = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated  = sorted.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
    resetPage();
  };

  const SortIcon = ({ field }) => (
    <span style={{ marginLeft: 4, opacity: sortField === field ? 1 : 0.3 }}>
      {sortField === field ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const uniqueLignes = [...new Set(entries.map((e) => e.id_ligne))].filter(Boolean);
  const hasFilters   = search || filterStatut || filterLigne || filterDateDebut || filterDateFin || filterReceveur;

  const clearFilters = () => {
    setSearch(""); setFilterStatut(""); setFilterLigne("");
    setFilterDateDebut(""); setFilterDateFin(""); setFilterReceveur("");
    resetPage();
  };

  const thStyle = { cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" };

  return (
    <div>
      <Notification message={message} onDone={() => setMessage({ text: "", type: "" })} />

      {timelineId && (
        <VoyageTimeline idVoyage={timelineId} onClose={() => setTimelineId(null)} />
      )}

      <div className="breadcrumb">
        SRTB › Direction › <span>Historique des voyages</span>
      </div>
      <div className="page-header">
        <div>
          <div className="page-title">Historique des voyages</div>
          <div className="page-subtitle">Traçabilité complète de chaque changement de statut</div>
        </div>
        <button className="btn btn-gray" onClick={fetchData} disabled={loading}>
          🔄 Actualiser
        </button>
      </div>

      <KpiCards stats={stats} />

      {/* ── Filtres ── */}
      <div className="card" style={{ marginBottom: 20, padding: "20px 24px" }}>
        <div className="form-section-title" style={{ marginBottom: 14 }}>Filtres</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label className="form-label">Recherche</label>
            <input
              className="search-input" style={{ margin: 0 }}
              placeholder="N° voyage, ligne, receveur..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            />
          </div>
          <div>
            <label className="form-label">Statut après</label>
            <select className="form-input" value={filterStatut}
              onChange={(e) => { setFilterStatut(e.target.value); resetPage(); }}>
              <option value="">Tous</option>
              <option value="actif">🟡 Actif</option>
              <option value="cloture">✅ Clôturé</option>
            </select>
          </div>
          <div>
            <label className="form-label">Ligne</label>
            <select className="form-input" value={filterLigne}
              onChange={(e) => { setFilterLigne(e.target.value); resetPage(); }}>
              <option value="">Toutes</option>
              {uniqueLignes.map((id) => (
                <option key={id} value={id}>{lignesMap[id] || `Ligne ${id}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Date début</label>
            <input type="date" className="form-input" value={filterDateDebut}
              onChange={(e) => { setFilterDateDebut(e.target.value); resetPage(); }} />
          </div>
          <div>
            <label className="form-label">Date fin</label>
            <input type="date" className="form-input" value={filterDateFin}
              onChange={(e) => { setFilterDateFin(e.target.value); resetPage(); }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
          <div style={{ flex: 1, maxWidth: 280 }}>
            <label className="form-label">Receveur</label>
            <input className="form-input" placeholder="Nom, prénom ou matricule..."
              value={filterReceveur}
              onChange={(e) => { setFilterReceveur(e.target.value); resetPage(); }} />
          </div>
          {hasFilters && (
            <button className="btn btn-gray" onClick={clearFilters}>✕ Effacer</button>
          )}
          <div style={{ fontSize: "0.82rem", color: "var(--gray-400)", paddingBottom: 2 }}>
            <strong style={{ color: "var(--navy)" }}>{filtered.length}</strong> entrée(s) / {entries.length} total
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--gray-400)" }}>
            Chargement de l'historique...
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--gray-400)" }}>
            {hasFilters
              ? "Aucune entrée ne correspond aux filtres."
              : "Aucun historique enregistré.\nExécutez la migration SQL pour activer le tracking."}
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={thStyle} onClick={() => handleSort("id")}># <SortIcon field="id" /></th>
                    <th style={thStyle} onClick={() => handleSort("id_voyage")}>Voyage <SortIcon field="id_voyage" /></th>
                    <th style={thStyle} onClick={() => handleSort("id_ligne")}>Ligne <SortIcon field="id_ligne" /></th>
                    <th>Receveur</th>
                    <th>Transition de statut</th>
                    <th style={thStyle} onClick={() => handleSort("created_at")}>Date / Heure <SortIcon field="created_at" /></th>
                    <th>Timeline</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <span style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>#{e.id}</span>
                      </td>
                      <td>
                        <span className="badge-matricule">{e.id_voyage}</span>
                      </td>
                      <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.87rem" }}>
                        {lignesMap[e.id_ligne] || (e.id_ligne ? `Ligne ${e.id_ligne}` : "—")}
                      </td>
                      <td>
                        {(e.nom || e.prenom) ? (
                          <div>
                            <div style={{ fontWeight: 500, fontSize: "0.87rem" }}>{e.prenom} {e.nom}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--gray-400)" }}>{e.matricule_agent}</div>
                          </div>
                        ) : (
                          <span style={{ color: "var(--gray-400)" }}>—</span>
                        )}
                      </td>
                      <td>
                        <ArrowTransition avant={e.statut_avant} apres={e.statut_apres} />
                      </td>
                      <td style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                        {fmtDateTime(e.created_at)}
                      </td>
                      <td>
                        <button
                          className="action-btn edit"
                          onClick={() => setTimelineId(e.id_voyage)}
                          title="Voir la timeline complète du voyage"
                        >
                          🕐 Timeline
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />

            <div style={{
              padding: "10px 16px", borderTop: "1px solid var(--gray-100)",
              fontSize: "12px", color: "var(--color-text-secondary)", textAlign: "center",
            }}>
              {startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, sorted.length)} sur {sorted.length} entrée(s)
              {hasFilters && ` (filtré de ${entries.length} total)`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}