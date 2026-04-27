import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/global.css'; 
import LoginPage from './pages/LoginPage';
import Sidebar from './components/Sidebar';
import GestionMdp from './pages/GestionMdp';
import Dashboard from './pages/Dashboard';
import ListeAgents from './pages/ListeAgents';
import ListeAppareils from './pages/ListeAppareils';
import HistoriqueAppareil from './pages/HistoriqueAppareil';
import AjouterAppareil from './pages/AjouterAppareil';
import ListeVoyages from './pages/ListeVoyages';
import Recettes from './pages/Recettes';
import useAutoLogout from './hooks/useAutoLogout';
import AjouterLigne from './pages/AjouterLigne';
import GestionRoles from './pages/GestionRoles';
import ListeLignes from './pages/ListeLignes';
import GestionMdpInfo from './pages/GestionMdp_info';
import HistoriqueVoyages from './pages/HistoriqueVoyages';
import ControleurRecettes from './pages/ControleurRecettes';
import SyncMonitor from './pages/SyncMonitor';
import GestionAnomalies from './pages/GestionAnomalies';


export default function App() {
  const [user, setUser] = useState(null);

  const handleLogout = () => setUser(null);

  useAutoLogout(handleLogout, 15);

  if (!user) {
    return <LoginPage onLogin={(userData) => setUser(userData)} />;
  }

  const getHomePage = () => {
    switch (user.role) {
      case 'informatique': return <GestionRoles user={user} />;
      case 'direction':    return <Dashboard user={user} />;
      case 'controleur':   return <ControleurRecettes />;
      default: return (
        <div style={{ textAlign: 'center', marginTop: 100 }}>
          <h2 style={{ color: '#C0392B' }}>⚠ Accès refusé</h2>
          <p style={{ color: '#8A94A6', marginTop: 8 }}>
            Votre rôle n'est pas autorisé à accéder à cette interface.
          </p>
        </div>
      );
    }
  };

  return (
    <Router>
      <div className="layout">
        <Sidebar user={user} onLogout={handleLogout} />
        <div className="main-content">
          <Routes>
            <Route path="/" element={getHomePage()} />

            {/* ── Routes Direction ── */}
            {user.role === 'direction' && (
              <>
                <Route path="/agents"             element={<ListeAgents />} />
                <Route path="/appareils"          element={<ListeAppareils />} />
                <Route path="/historique"         element={<HistoriqueAppareil />} />
                <Route path="/ajouter-appareil"   element={<AjouterAppareil />} />
                <Route path="/voyages"            element={<ListeVoyages />} />
                <Route path="/recettes"           element={<Recettes />} />
                <Route path="/ajouter-ligne"      element={<AjouterLigne />} />
                <Route path="/gestion-mdp"        element={<GestionMdp />} />
                <Route path="/lignes"             element={<ListeLignes />} />
                <Route path="/historique-voyages" element={<HistoriqueVoyages />} />
              </>
            )}

            {/* ── Routes Controleur ── */}
            {user.role === 'controleur' && (
              <>
                <Route path="/"             element={<ControleurRecettes />} />
                <Route path="/sync-monitor" element={<SyncMonitor />} />
                <Route path="/anomalies" element={<GestionAnomalies />} />

              </>
            )}

            {/* ── Routes Informatique ── */}
            {user.role === 'informatique' && (
              <>
                <Route path="/gestion-roles" element={<GestionRoles user={user} />} />
                <Route path="/gestion-mdp"   element={<GestionMdpInfo />} />
              </>
            )}

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}