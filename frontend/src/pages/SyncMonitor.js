import React, { useState } from "react";
import * as XLSX from "xlsx";
import { useSyncStream } from "../hooks/useSyncStream";
import SyncStatusBadge from "../components/SyncStatusBadge";

const OFFLINE_AFTER_SECONDS = 90;

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");

const fmtDT = (ms) => {
  const val = Number(ms || 0);
  if (!isFinite(val) || isNaN(val)) return "— DT";
  return (
    (val / 1000).toLocaleString("fr-FR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }) + " DT"
  );
};

const fmtAgo = (sec) => {
  if (sec == null) return "—";
  if (sec < 60)    return `${sec}s`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h`;
};

const fmtTime = (isoString) => {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString("fr-FR", {
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// ── AgentCard ─────────────────────────────────────────────────────────────────

function AgentCard({ agent }) {
  const isOnline   = agent.seconds_ago != null && agent.seconds_ago < OFFLINE_AFTER_SECONDS;
  const hasFailure = agent.failed_count > 0;
  const hasPending = agent.pending_count > 0;

  return (
    <div
      className="card"
      style={{
        padding:    "18px 20px",
        borderLeft: `4px solid ${
          hasFailure ? "var(--red)" : isOnline ? "var(--green)" : "var(--gray-200)"
        }`,
        transition: "border-color 0.4s",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.92rem", marginBottom: 4 }}>
            {agent.prenom} {agent.nom}
          </div>
          <span className="badge-matricule">{agent.matricule_agent}</span>
        </div>
        <SyncStatusBadge secondsAgo={agent.seconds_ago} />
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
        {[
          {
            label: "En attente",
            value: agent.pending_count,
            warn:  hasPending,
          },
          {
            label: "Échecs",
            value: agent.failed_count,
            warn:  hasFailure,
          },
          {
            label: "operation",
            value: fmt(agent.tickets_today),
            warn:  false,
          },
          {
            label: "Recette auj.",
            value: fmtDT(agent.recette_today_ms),
            warn:  false,
            small: true,
          },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background:   "var(--offwhite)",
              borderRadius: 8,
              padding:      "8px 12px",
              border:       k.warn
                ? "1px solid rgba(190,56,23,0.3)"
                : "1px solid var(--gray-100)",
            }}
          >
            <div
              style={{
                fontSize:      "0.68rem",
                color:         "var(--gray-400)",
                textTransform: "uppercase",
                letterSpacing: "0.7px",
                marginBottom:  2,
              }}
            >
              {k.label}
            </div>
            <div
              style={{
                fontSize:   k.small ? "0.88rem" : "1.1rem",
                fontWeight: 700,
                color:      k.warn ? "var(--red)" : "var(--navy)",
                marginTop:  2,
              }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop:  12,
          fontSize:   "0.73rem",
          color:      "var(--gray-400)",
          display:    "flex",
          gap:        12,
          flexWrap:   "wrap",
        }}
      >
        <span>Vu il y a {fmtAgo(agent.seconds_ago)}</span>
        <span>Sync {fmtTime(agent.last_sync_at)}</span>
        {agent.app_version && <span>v{agent.app_version}</span>}
      </div>
    </div>
  );
}

// ── SyncMonitor page ──────────────────────────────────────────────────────────

export default function SyncMonitor() {
  const { agents, connected } = useSyncStream();
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all"); // "all" | "online" | "offline" | "anomalie"

  // ── derived values ────────────────────────────────────────────────────────

  const online    = agents.filter((a) => a.seconds_ago < OFFLINE_AFTER_SECONDS);
  const offline   = agents.filter((a) => a.seconds_ago >= OFFLINE_AFTER_SECONDS);
  const anomalies = agents.filter((a) => a.failed_count > 0);
  const pending   = agents.reduce((s, a) => s + Number(a.pending_count || 0), 0);

  const filtered = agents.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      `${a.prenom} ${a.nom}`.toLowerCase().includes(q) ||
      String(a.matricule_agent).includes(q);

    const isOnline = a.seconds_ago < OFFLINE_AFTER_SECONDS;
    const matchFilter =
      filter === "all"      ||
      (filter === "online"   && isOnline)         ||
      (filter === "offline"  && !isOnline)         ||
      (filter === "anomalie" && a.failed_count > 0);

    return matchSearch && matchFilter;
  });

  // ── export ────────────────────────────────────────────────────────────────

  const exportSnapshot = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "Matricule", "Prénom", "Nom",
        "Statut", "En attente", "Échecs",
        "operation", "Recette auj. (ms)",
        "Dernière sync", "Vu il y a (s)", "Version",
      ],
      ...agents.map((a) => [
        a.matricule_agent,
        a.prenom,
        a.nom,
        a.seconds_ago < OFFLINE_AFTER_SECONDS ? "En ligne" : "Hors ligne",
        a.pending_count,
        a.failed_count,
        a.tickets_today,
        a.recette_today_ms,
        a.last_sync_at,
        a.seconds_ago,
        a.app_version,
      ]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sync snapshot");
    XLSX.writeFile(wb, `sync_snapshot_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        SRTB › Contrôleur › <span>Sync monitor</span>
      </div>

      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">Sync monitor</div>
          <div className="page-subtitle">
            État temps réel des agents mobiles
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* SSE connection pill */}
          <span
            style={{
              display:      "inline-flex",
              alignItems:   "center",
              gap:          6,
              fontSize:     "0.78rem",
              padding:      "5px 14px",
              borderRadius: 20,
              fontWeight:   700,
              background:   connected
                ? "rgba(27,107,58,0.1)"
                : "rgba(190,56,23,0.08)",
              color: connected ? "var(--green)" : "var(--red)",
            }}
          >
            <span
              style={{
                width:        7,
                height:       7,
                borderRadius: "50%",
                background:   connected ? "var(--green)" : "var(--red)",
                animation:    connected ? "pulse 1.5s ease-in-out infinite" : "none",
              }}
            />
            {connected ? "Stream connecté" : "Déconnecté"}
          </span>

          <button className="btn btn-gold" onClick={exportSnapshot}>
            ⬇ Exporter
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div
        className="dashboard-cards"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}
      >
        {[
          { icon: "📱", label: "Total agents",    value: agents.length,    color: "blue" },
          { icon: "🟢", label: "En ligne",        value: online.length,    color: "green" },
          { icon: "⚠️", label: "Anomalies",       value: anomalies.length, color: "gold", warn: anomalies.length > 0 },
          { icon: "⏳", label: "Tickets en attente", value: pending,       color: "blue", warn: pending > 0 },
        ].map((k) => (
          <div
            key={k.label}
            className={`dashboard-card ${k.color}`}
            style={k.warn && k.value > 0 ? { borderTop: "3px solid var(--red)" } : {}}
          >
            <div className="card-icon-wrap">{k.icon}</div>
            <div className="card-number" style={{ fontSize: "1.6rem" }}>{k.value}</div>
            <div className="card-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: "16px 20px" }}>
        <div
          style={{
            display:         "flex",
            gap:             12,
            alignItems:      "center",
            flexWrap:        "wrap",
          }}
        >
          <input
            className="search-input"
            style={{ margin: 0, flex: 1, minWidth: 200 }}
            placeholder="Rechercher par nom ou matricule..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {[
            { key: "all",      label: `Tous (${agents.length})` },
            { key: "online",   label: `En ligne (${online.length})` },
            { key: "offline",  label: `Hors ligne (${offline.length})` },
            { key: "anomalie", label: `Anomalies (${anomalies.length})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding:      "7px 16px",
                borderRadius: 20,
                border:       filter === f.key
                  ? "none"
                  : "1px solid var(--gray-100)",
                background:   filter === f.key
                  ? "var(--navy)"
                  : "transparent",
                color:        filter === f.key
                  ? "#fff"
                  : "var(--gray-600)",
                fontWeight:   filter === f.key ? 700 : 400,
                fontSize:     "0.82rem",
                cursor:       "pointer",
                whiteSpace:   "nowrap",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agent cards grid */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding:   60,
            color:     "var(--gray-400)",
          }}
        >
          {agents.length === 0
            ? "En attente du premier heartbeat..."
            : "Aucun agent trouvé"}
        </div>
      ) : (
        <div
          style={{
            display:             "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap:                 16,
          }}
        >
          {filtered.map((agent) => (
            <AgentCard key={agent.matricule_agent} agent={agent} />
          ))}
        </div>
      )}

      {/* Summary footer */}
      {filtered.length > 0 && (
        <div
          style={{
            marginTop:  20,
            textAlign:  "center",
            fontSize:   "0.78rem",
            color:      "var(--gray-400)",
          }}
        >
          {filtered.length} agent(s) affiché(s) · mis à jour en temps réel
        </div>
      )}
    </div>
  );
}