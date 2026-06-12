import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/global.css";
import axios from "../api/axios";

const PBI_DIRECTION   = "https://app.powerbi.com/view?r=eyJrIjoiZThlOGZmYTQtMTZjZS00Y2FiLWFhMzItMWQwYmQyMDc3MmU2IiwidCI6ImRiZDY2NjRkLTRlYjktNDZlYi05OWQ4LTVjNDNiYTE1M2M2MSIsImMiOjl9";
const PBI_RECETTES    = "https://app.powerbi.com/view?r=eyJrIjoiZmJlMTc2ODMtMjYwMS00ZTRiLWIyYWQtNmU5YzQxYmZjOTA3IiwidCI6ImRiZDY2NjRkLTRlYjktNDZlYi05OWQ4LTVjNDNiYTE1M2M2MSIsImMiOjl9";
const PBI_PREDICTIONS = "https://app.powerbi.com/view?r=eyJrIjoiZmJlMTc2ODMtMjYwMS00ZTRiLWIyYWQtNmU5YzQxYmZjOTA3IiwidCI6ImRiZDY2NjRkLTRlYjktNDZlYi05OWQ4LTVjNDNiYTE1M2M2MSIsImMiOjl9";

export default function Dashboard({ user }) {
  const [totalAgents, setTotalAgents] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`/agents`).then((res) => {
      setTotalAgents(res.data.agents.length);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <div className="breadcrumb">
        SRTB › <span>Accueil</span>
      </div>
      <div className="page-header">
        <div>
          <div className="page-title">Tableau de bord</div>
          <div className="page-subtitle">
            Bienvenue, {user?.prenom} {user?.nom}
          </div>
        </div>
      </div>

      {/* ── Vue d'ensemble ── */}
      <div className="form-section-title">Vue d'ensemble</div>
      <div className="dashboard-cards">
        <div className="dashboard-card blue">
          <div className="card-icon-wrap">👥</div>
          <div className="card-number">{totalAgents}</div>
          <div className="card-label">Total Agents</div>
        </div>

        <div
          className="dashboard-card gold"
          onClick={() => navigate("/voyages")}
          style={{ cursor: "pointer" }}
        >
          <div className="card-icon-wrap">🚌</div>
          <div className="card-number" style={{ fontSize: "1.4rem", paddingTop: 6 }}>
            Voyages
          </div>
          <div className="card-label">Programmés</div>
        </div>

        <div
          className="dashboard-card green"
          onClick={() => navigate("/recettes")}
          style={{ cursor: "pointer" }}
        >
          <div className="card-icon-wrap">📊</div>
          <div className="card-number" style={{ fontSize: "1.4rem", paddingTop: 6 }}>
            Recettes
          </div>
          <div className="card-label">Journalières</div>
        </div>
      </div>

      {/* ── Dashboards & analyses ── */}
      <div className="form-section-title" style={{ marginTop: 8 }}>
        Dashboards &amp; analyses
      </div>
      <div className="dashboard-cards">

        {/* Dashboard Direction  */}
        <div
          className="dashboard-card blue"
          onClick={() => window.open(PBI_DIRECTION, "_blank", "noopener,noreferrer")}
          style={{ cursor: "pointer" }}
        >
          <div className="card-icon-wrap">📋</div>
          <div className="card-number" style={{ fontSize: "1.4rem", paddingTop: 6 }}>
            Direction
          </div>
          <div className="card-label">Dashboard Exploitation</div>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-400)", marginTop: 8, lineHeight: 1.4 }}>
            Voyages, agents, appareils et lignes de transport
          </div>
          <span className="badge-role informatique" style={{ marginTop: 10, display: "inline-block" }}>
            ↗ Ouvrir Power BI
          </span>
        </div>

        {/* Dashboard Contrôleur des recettes  */}
        <div
          className="dashboard-card gold"
          onClick={() => window.open(PBI_RECETTES, "_blank", "noopener,noreferrer")}
          style={{ cursor: "pointer" }}
        >
          <div className="card-icon-wrap">💰</div>
          <div className="card-number" style={{ fontSize: "1.4rem", paddingTop: 6 }}>
            Recettes
          </div>
          <div className="card-label">Dashboard Contrôleur</div>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-400)", marginTop: 8, lineHeight: 1.4 }}>
            Recettes journalières, tickets vendus et anomalies
          </div>
          <span className="badge-role direction" style={{ marginTop: 10, display: "inline-block" }}>
            ↗ Ouvrir Power BI
          </span>
        </div>

        {/* Prédictions  */}
        <div
          className="dashboard-card green"
          onClick={() => window.open(PBI_PREDICTIONS, "_blank", "noopener,noreferrer")}
          style={{ cursor: "pointer" }}
        >
          <div className="card-icon-wrap">🔮</div>
          <div className="card-number" style={{ fontSize: "1.4rem", paddingTop: 6 }}>
            Prédictions
          </div>
          <div className="card-label">Intelligence prédictive</div>
          <div style={{ fontSize: "0.78rem", color: "var(--gray-400)", marginTop: 8, lineHeight: 1.4 }}>
            Prévisions de recettes et tendances basées sur l'historique
          </div>
          <span className="badge-role controle" style={{ marginTop: 10, display: "inline-block" }}>
            ↗ Ouvrir Prediction 
          </span>
        </div>

      </div>
    </div>
  );
}