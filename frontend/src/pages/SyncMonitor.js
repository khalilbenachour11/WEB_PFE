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
  if (sec < 60)   return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
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

// ── StatCell ──────────────────────────────────────────────────────────────────

function StatCell(props) {
  var label    = props.label;
  var value    = props.value;
  var warn     = props.warn;
  var small    = props.small;
  var fullRow  = props.fullRow;

  return React.createElement(
    "div",
    {
      style: {
        gridColumn:   fullRow ? "1 / -1" : undefined,
        background:   "var(--offwhite)",
        borderRadius: 8,
        padding:      "8px 12px",
        border:       warn
          ? "1px solid rgba(190,56,23,0.3)"
          : "1px solid var(--gray-100)",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          fontSize:      "0.68rem",
          color:         "var(--gray-400)",
          textTransform: "uppercase",
          letterSpacing: "0.7px",
          marginBottom:  2,
        },
      },
      label
    ),
    React.createElement(
      "div",
      {
        style: {
          fontSize:   small ? "0.88rem" : "1.1rem",
          fontWeight: 700,
          color:      warn ? "var(--red)" : "var(--navy)",
          marginTop:  2,
        },
      },
      value
    )
  );
}

// ── AgentCard ─────────────────────────────────────────────────────────────────

function AgentCard(props) {
  var agent = props.agent;

  var isOnline   = agent.seconds_ago != null && agent.seconds_ago < OFFLINE_AFTER_SECONDS;
  var hasFailure = agent.failed_count > 0;
  var hasPending = agent.pending_count > 0;

  return React.createElement(
    "div",
    {
      className: "card",
      style: {
        padding:    "18px 20px",
        borderLeft: "4px solid " + (hasFailure ? "var(--red)" : isOnline ? "var(--green)" : "var(--gray-200)"),
        transition: "border-color 0.4s",
      },
    },

    // Header
    React.createElement(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 } },
      React.createElement(
        "div",
        null,
        React.createElement(
          "div",
          { style: { fontWeight: 600, fontSize: "0.92rem", marginBottom: 4 } },
          agent.prenom + " " + agent.nom
        ),
        React.createElement("span", { className: "badge-matricule" }, agent.matricule_agent)
      ),
      React.createElement(SyncStatusBadge, { secondsAgo: agent.seconds_ago })
    ),

    // Stats grid
    React.createElement(
      "div",
      { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 } },

      React.createElement(StatCell, { label: "En attente",      value: agent.pending_count,        warn: hasPending }),
      React.createElement(StatCell, { label: "Échecs",          value: agent.failed_count,         warn: hasFailure }),
      React.createElement(StatCell, { label: "Opérations auj.", value: fmt(agent.tickets_today),   warn: false }),
      React.createElement(StatCell, { label: "Qté tickets auj.", value: fmt(agent.quantite_today), warn: false }),
      React.createElement(StatCell, { label: "Recette auj.",    value: fmtDT(agent.recette_today_ms), warn: false, small: true, fullRow: true })
    ),

    // Footer
    React.createElement(
      "div",
      {
        style: {
          marginTop: 12,
          fontSize:  "0.73rem",
          color:     "var(--gray-400)",
          display:   "flex",
          gap:       12,
          flexWrap:  "wrap",
        },
      },
      React.createElement("span", null, "Vu il y a " + fmtAgo(agent.seconds_ago)),
      React.createElement("span", null, "Sync " + fmtTime(agent.last_sync_at)),
      agent.app_version
        ? React.createElement("span", null, "v" + agent.app_version)
        : null
    )
  );
}

// ── SyncMonitor page ──────────────────────────────────────────────────────────

export default function SyncMonitor() {
  var streamData = useSyncStream();
  var agents     = streamData.agents;
  var connected  = streamData.connected;

  var searchState = useState("");
  var search      = searchState[0];
  var setSearch   = searchState[1];

  var filterState = useState("all");
  var filter      = filterState[0];
  var setFilter   = filterState[1];

  // ── derived values ──────────────────────────────────────────────────────

  var online    = agents.filter(function(a) { return a.seconds_ago < OFFLINE_AFTER_SECONDS; });
  var offline   = agents.filter(function(a) { return a.seconds_ago >= OFFLINE_AFTER_SECONDS; });
  var anomalies = agents.filter(function(a) { return a.failed_count > 0; });
  var pending   = agents.reduce(function(s, a) { return s + Number(a.pending_count || 0); }, 0);

  var filtered = agents.filter(function(a) {
    var q = search.toLowerCase();
    var matchSearch =
      !q ||
      (a.prenom + " " + a.nom).toLowerCase().includes(q) ||
      String(a.matricule_agent).includes(q);

    var isOnline = a.seconds_ago < OFFLINE_AFTER_SECONDS;
    var matchFilter =
      filter === "all"      ||
      (filter === "online"   && isOnline)          ||
      (filter === "offline"  && !isOnline)          ||
      (filter === "anomalie" && a.failed_count > 0);

    return matchSearch && matchFilter;
  });

  // ── export ──────────────────────────────────────────────────────────────

  function exportSnapshot() {
    var rows = [
      [
        "Matricule", "Prénom", "Nom",
        "Statut", "En attente", "Échecs",
        "Opérations auj.", "Qté tickets auj.",
        "Recette auj. (ms)",
        "Dernière sync", "Vu il y a (s)", "Version",
      ],
    ].concat(
      agents.map(function(a) {
        return [
          a.matricule_agent,
          a.prenom,
          a.nom,
          a.seconds_ago < OFFLINE_AFTER_SECONDS ? "En ligne" : "Hors ligne",
          a.pending_count,
          a.failed_count,
          a.tickets_today,
          a.quantite_today,
          a.recette_today_ms,
          a.last_sync_at,
          a.seconds_ago,
          a.app_version,
        ];
      })
    );

    var ws = XLSX.utils.aoa_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sync snapshot");
    XLSX.writeFile(wb, "sync_snapshot_" + new Date().toISOString().slice(0, 10) + ".xlsx");
  }

  // ── filter button config ────────────────────────────────────────────────

  var filterButtons = [
    { key: "all",      label: "Tous ("         + agents.length    + ")" },
    { key: "online",   label: "En ligne ("      + online.length    + ")" },
    { key: "offline",  label: "Hors ligne ("    + offline.length   + ")" },
    { key: "anomalie", label: "Anomalies ("     + anomalies.length + ")" },
  ];

  // ── KPI config ──────────────────────────────────────────────────────────

  var kpis = [
    {  label: "Total agents",       value: agents.length,    color: "blue",  warn: false },
    {  label: "En ligne",           value: online.length,    color: "green", warn: false },
    { label: "Anomalies",          value: anomalies.length, color: "gold",  warn: anomalies.length > 0 },
    {  label: "Tickets en attente", value: pending,          color: "blue",  warn: pending > 0 },
  ];

  // ── render ──────────────────────────────────────────────────────────────

  return React.createElement(
    "div",
    null,

    // Breadcrumb
    React.createElement(
      "div",
      { className: "breadcrumb" },
      "SRTB › Contrôleur › ",
      React.createElement("span", null, "Sync monitor")
    ),

    // Page header
    React.createElement(
      "div",
      { className: "page-header" },
      React.createElement(
        "div",
        null,
        React.createElement("div", { className: "page-title" }, "Sync monitor"),
        React.createElement("div", { className: "page-subtitle" }, "État temps réel des agents mobiles")
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 10, alignItems: "center" } },

        // SSE pill
        React.createElement(
          "span",
          {
            style: {
              display:      "inline-flex",
              alignItems:   "center",
              gap:          6,
              fontSize:     "0.78rem",
              padding:      "5px 14px",
              borderRadius: 20,
              fontWeight:   700,
              background:   connected ? "rgba(27,107,58,0.1)" : "rgba(190,56,23,0.08)",
              color:        connected ? "var(--green)" : "var(--red)",
            },
          },
          React.createElement("span", {
            style: {
              width:        7,
              height:       7,
              borderRadius: "50%",
              background:   connected ? "var(--green)" : "var(--red)",
              animation:    connected ? "pulse 1.5s ease-in-out infinite" : "none",
            },
          }),
          connected ? "Stream connecté" : "Déconnecté"
        ),

        // Export button
        React.createElement(
          "button",
          { className: "btn btn-gold", onClick: exportSnapshot },
          "⬇ Exporter"
        )
      )
    ),

    // KPI cards
    React.createElement(
      "div",
      {
        className: "dashboard-cards",
        style: { gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 },
      },
      kpis.map(function(k) {
        return React.createElement(
          "div",
          {
            key:       k.label,
            className: "dashboard-card " + k.color,
            style:     k.warn && k.value > 0 ? { borderTop: "3px solid var(--red)" } : {},
          },
          
          
          React.createElement("div", { className: "card-number", style: { fontSize: "1.6rem" } }, k.value),
          React.createElement("div", { className: "card-label" }, k.label)
        );
      })
    ),

    // Filters bar
    React.createElement(
      "div",
      { className: "card", style: { marginBottom: 20, padding: "16px 20px" } },
      React.createElement(
        "div",
        { style: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" } },

        React.createElement("input", {
          className:   "search-input",
          style:       { margin: 0, flex: 1, minWidth: 200 },
          placeholder: "Rechercher par nom ou matricule...",
          value:       search,
          onChange:    function(e) { setSearch(e.target.value); },
        }),

        filterButtons.map(function(f) {
          var active = filter === f.key;
          return React.createElement(
            "button",
            {
              key:     f.key,
              onClick: function() { setFilter(f.key); },
              style: {
                padding:      "7px 16px",
                borderRadius: 20,
                border:       active ? "none" : "1px solid var(--gray-100)",
                background:   active ? "var(--navy)" : "transparent",
                color:        active ? "#fff" : "var(--gray-600)",
                fontWeight:   active ? 700 : 400,
                fontSize:     "0.82rem",
                cursor:       "pointer",
                whiteSpace:   "nowrap",
              },
            },
            f.label
          );
        })
      )
    ),

    // Agent cards grid or empty state
    filtered.length === 0
      ? React.createElement(
          "div",
          { style: { textAlign: "center", padding: 60, color: "var(--gray-400)" } },
          agents.length === 0 ? "En attente du premier heartbeat..." : "Aucun agent trouvé"
        )
      : React.createElement(
          "div",
          {
            style: {
              display:             "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap:                 16,
            },
          },
          filtered.map(function(agent) {
            return React.createElement(AgentCard, {
              key:   agent.matricule_agent,
              agent: agent,
            });
          })
        ),

    // Summary footer
    filtered.length > 0
      ? React.createElement(
          "div",
          { style: { marginTop: 20, textAlign: "center", fontSize: "0.78rem", color: "var(--gray-400)" } },
          filtered.length + " agent(s) affiché(s) · mis à jour en temps réel"
        )
      : null
  );
}