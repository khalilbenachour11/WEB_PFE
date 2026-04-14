import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/global.css';

const API = 'http://localhost:5000/api';
export default function Dashboard({ user }) {
  const [totalAgents, setTotalAgents] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/agents`).then(res => {
      setTotalAgents(res.data.agents.length);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <div className="breadcrumb">SRTB › <span>Accueil </span></div>
      <div className="page-header">
        <div>
          <div className="page-title">Accueil  </div>
          <div className="page-subtitle">
            Bienvenue, {user?.prenom} {user?.nom}
          </div>
        </div>
      </div>

      <div className="dashboard-cards">
        <div className="dashboard-card blue">
          <div className="card-icon-wrap">👥</div>
          <div className="card-number">{totalAgents}</div>
          <div className="card-label">Total Agents</div>
        </div>

        <div
          className="dashboard-card gold"
          onClick={() => navigate('/voyages')}
          style={{ cursor: 'pointer' }}
        >
          <div className="card-icon-wrap">🚌</div>
          <div className="card-number" style={{ fontSize: '1.4rem', paddingTop: 6 }}>Voyages</div>
          <div className="card-label">Programmés</div>
        </div>

        <div className="dashboard-card green"
        onClick={() => navigate('/recettes')}
        style={{ cursor: 'pointer' }}>
          <div className="card-icon-wrap">📊</div>
          <div className="card-number" style={{ fontSize: '1.4rem', paddingTop: 6 }}>Recettes</div>
          <div className="card-label">Journalières</div>
        </div>
      </div>
    </div>
  );
}