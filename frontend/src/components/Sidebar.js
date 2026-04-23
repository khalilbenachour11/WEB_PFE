import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/global.css';

const menuByRole = {
  informatique: [
    { path: '/gestion-roles', icon: '🔑', label: 'Gestion des rôles' },
    { path: '/gestion-mdp',   icon: '🔑', label: 'Gestion mots de passe' },
  ],
  direction: [
    { path: '/',                   icon: '⊞',  label: 'Accueil' },
    { path: '/gestion-mdp',        icon: '🔑',  label: 'Gestion mots de passe' },
    { path: '/agents',             icon: '👥',  label: 'Liste des employés' },
    { path: '/appareils',          icon: '📱',  label: 'Liste des appareils' },
    { path: '/lignes',             icon: '📋',  label: 'Liste des lignes' },
    { path: '/ajouter-appareil',   icon: '➕',  label: 'Ajouter appareil' },
    { path: '/voyages',            icon: '🚌',  label: 'Voyages receveurs' },
    { path: '/ajouter-ligne',      icon: '🛣️', label: 'Ajouter une ligne' },
    { path: '/historique',         icon: '📅',  label: 'Historique appareils' },
    { path: '/historique-voyages', icon: '🗂️', label: 'Historique voyages' },
  ],
  controleur: [
    { path: '/',             icon: '📊', label: 'Contrôle des recettes' },
    { path: '/sync-monitor', icon: '📡', label: 'Sync monitor' },
  ],
};

const roleLabels = {
  informatique: 'Service Informatique',
  direction:    'Direction / Exploitation',
  controleur:   'Contrôleur des recettes',
};

export default function Sidebar({ user, onLogout }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const menuItems = menuByRole[user?.role] || [];

  return (
    <div className="sidebar">

      <div className="sidebar-logo">
        <img src="/logo_srtb.png" alt="SRTB"
          onError={e => e.target.style.display = 'none'} />
        <h2>SRTB</h2>
        <span>Administration</span>
      </div>

      <div className="sidebar-scroll-area">
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <div key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-info">
            <div className="admin-avatar">
              {user?.prenom?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="admin-name">{user?.prenom} {user?.nom}</div>
              <div className="admin-role">{roleLabels[user?.role]}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            ⎋ Déconnexion
          </button>
        </div>
      </div>

    </div>
  );
}