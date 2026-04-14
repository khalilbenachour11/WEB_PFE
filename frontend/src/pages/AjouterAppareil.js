import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/global.css';
import Notification from '../components/Notification';

const API = 'http://localhost:5000/api';

export default function AjouterAppareil() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    num_serie: '',
    statut: 'en stocke',
    date_de_mise_en_service: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.num_serie || !form.date_de_mise_en_service) {
      setMessage({ text: 'Veuillez remplir tous les champs.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/ajouter_appareil`, form);
      if (res.data.success) {
        setMessage({ text: 'Appareil ajouté avec succès !', type: 'success' });
        setTimeout(() => navigate('/appareils'), 1500);
      } else {
        setMessage({ text: res.data.message, type: 'error' });
      }
    } catch {
      setMessage({ text: 'Erreur de connexion au serveur.', type: 'error' });
    }
    setLoading(false);
  };

  return (
    <div>
      <Notification message={message} onDone={() => setMessage({ text: '', type: '' })} />

      <div className="breadcrumb">SRTB › Direction › <span>Ajouter appareil</span></div>
      <div className="page-header">
        <div>
          <div className="page-title">Ajouter un appareil</div>
          <div className="page-subtitle">Enregistrer un nouvel appareil dans le système</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 500 }}>
        <div className="form-section-title">Informations appareil</div>

        <div className="form-group">
          <label className="form-label">Numéro de série</label>
          <input
            className="form-input"
            placeholder="Ex: 123456789"
            value={form.num_serie}
            onChange={e => setForm({ ...form, num_serie: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Date de mise en service</label>
          <input
            className="form-input"
            type="date"
            value={form.date_de_mise_en_service}
            onChange={e => setForm({ ...form, date_de_mise_en_service: e.target.value })}
          />
        </div>

        <div className="form-actions">
          <button className="btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Ajout...' : '✓ Ajouter'}
          </button>
          <button className="btn btn-gray" onClick={() => navigate('/appareils')}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}