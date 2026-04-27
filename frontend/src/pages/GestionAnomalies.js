import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import '../styles/global.css';
import Notification from '../components/Notification';
import Pagination from '../components/Pagination';

const API = 'http://localhost:5000/api';
const ITEMS_PER_PAGE = 15;

// ══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════════════════════════════════════

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const STATUT_CONFIG = {
  non_traite: { label: 'Non traité',  bg: 'rgba(190,56,23,0.1)',   color: 'var(--red)',      border: 'rgba(190,56,23,0.3)'  },
  enregistre: { label: 'Enregistré', bg: 'rgba(27,107,58,0.1)',   color: 'var(--green)',    border: 'rgba(27,107,58,0.3)'  },
  ignore:     { label: 'Ignoré',     bg: 'rgba(138,148,166,0.1)', color: 'var(--gray-400)', border: 'var(--gray-200)'      },
};

function StatutBadge({ statut }) {
  const cfg = STATUT_CONFIG[statut] || STATUT_CONFIG.non_traite;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {statut === 'non_traite' ? '⚠️' : statut === 'enregistre' ? '✅' : ''} {cfg.label}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PARSER EXCEL — adapté au format exact de l'app mobile SRTB
// Sheets: Résumé | Tickets | Par tarif | Gratuits / catégorie | Par segment | Par voyage
// ══════════════════════════════════════════════════════════════════════════════

function parseExcelMobile(workbook) {
  const tickets  = [];
  const warnings = [];
  let matricule_agent = null;

  // ── 1. Lire matricule depuis sheet "Résumé" ────────────────────────────────
  // Format: ligne "Agent : Ali Ben Salem" + ligne "Matricule : 2002"
  const resumeSheet = workbook.Sheets['Résumé'];
  if (resumeSheet) {
    const rows = XLSX.utils.sheet_to_json(resumeSheet, { header: 1, defval: '' });
    for (const row of rows) {
      for (const cell of row) {
        const cellStr = String(cell || '');
        // Chercher matricule directement dans le nom du fichier ou dans les cellules
        const matchMat = cellStr.match(/(?:matricule|mat)[^\d]*(\d{4,6})/i);
        if (matchMat) { matricule_agent = parseInt(matchMat[1]); break; }
      }
      if (matricule_agent) break;
    }

    // Si pas trouvé par regex, chercher dans le nom du fichier (ex: rapport_journee_2002_...)
    // → sera passé en paramètre depuis handleFile
  }

  // ── 2. Lire tickets depuis sheet "Tickets" ─────────────────────────────────
  const ticketSheet = workbook.Sheets['Tickets'];
  if (!ticketSheet) {
    warnings.push('Sheet "Tickets" introuvable dans le fichier.');
    return { tickets, warnings, matricule_agent };
  }

  // sheet_to_json avec header:1 pour récupérer toutes les lignes brutes
  const allRows = XLSX.utils.sheet_to_json(ticketSheet, { header: 1, defval: '' });

  // Trouver la ligne d'entête (#, Date, Heure, Voyage, ...)
  let headerIdx = -1;
  let headers   = [];
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i].map(c => String(c || '').trim());
    if (row.includes('#') && row.includes('Voyage') && row.includes('Sync')) {
      headerIdx = i;
      headers   = row;
      break;
    }
  }

  if (headerIdx === -1) {
    warnings.push('Entête introuvable dans le sheet "Tickets", colonnes attendues : #, Date, Heure, Voyage, Départ, Arrivée, Segment, Tarif, Qté, Prix unit. (ms), Total (ms), Sync');
    return { tickets, warnings, matricule_agent };
  }

  // Index de chaque colonne
  const col = (name) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
  const iNum      = col('#');
  const iDate     = col('Date');
  const iHeure    = col('Heure');
  const iVoyage   = col('Voyage');
  const iDepart   = col('Départ');
  const iArrivee  = col('Arrivée');
  
  const iTarif    = col('Tarif');
  const iQte      = col('Qté');
  const iPrix     = col('Prix unit');
  const iTotal    = col('Total');
  const iSync     = col('Sync');

  // Lire les lignes de données
  for (let i = headerIdx + 1; i < allRows.length; i++) {
    const row  = allRows[i];
    const sync = String(row[iSync] || '').toLowerCase().trim();

    // Ignorer lignes vides ou lignes TOTAL
    const numCell = String(row[iNum] || '').trim();
    if (!numCell || numCell.toUpperCase() === 'TOTAL' || !sync) continue;

    // Garder uniquement failed et pending
    if (sync !== 'failed' && sync !== 'pending') continue;

    // Parser id_voyage depuis "#59" → 59
    const voyageRaw = String(row[iVoyage] || '');
    const id_voyage  = parseInt(voyageRaw.replace(/[^0-9]/g, '')) || null;

    // Parser date_heure: "16/04/2026" + "00:16" → "2026-04-16 00:16:00"
    let date_heure = null;
    const dateRaw  = String(row[iDate]  || '').trim();
    const heureRaw = String(row[iHeure] || '00:00').trim();
    if (dateRaw) {
      const parts = dateRaw.split('/');
      if (parts.length === 3) {
        // dd/MM/yyyy → yyyy-MM-dd
        date_heure = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')} ${heureRaw}:00`;
      }
    }

    

    // Type tarif en lowercase
    const type_tarif = String(row[iTarif] || '').trim().toLowerCase() || null;

    tickets.push({
      matricule_agent: matricule_agent,
      id_voyage:       id_voyage,
      
      point_depart:    String(row[iDepart]  || '').trim() || null,
      point_arrivee:   String(row[iArrivee] || '').trim() || null,
      type_tarif:      type_tarif,
      quantite:        parseInt(row[iQte]   || 1)  || 1,
      prix_unitaire:   parseInt(row[iPrix]  || 0)  || 0,
      montant_total:   parseInt(row[iTotal] || 0)  || 0,
      date_heure:      date_heure,
      erreur:          `Sync ${sync} importé depuis rapport journée`,
    });
  }

  if (tickets.length === 0)
    warnings.push('Aucun ticket avec Sync = "failed" ou "pending" trouvé dans le sheet "Tickets".');

  return { tickets, warnings, matricule_agent };
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL CORRECTION
// ══════════════════════════════════════════════════════════════════════════════

function ModalCorrection({ anomalie, onClose, onSuccess }) {
  const [form, setForm] = useState({
    id_voyage:       anomalie.id_voyage       || '',
    point_depart:    anomalie.point_depart    || '',
    point_arrivee:   anomalie.point_arrivee   || '',
    type_tarif:      anomalie.type_tarif      || '',
    quantite:        anomalie.quantite        || 1,
    prix_unitaire:   anomalie.prix_unitaire   || 0,
    montant_total:   anomalie.montant_total   || 0,
    date_heure:      anomalie.date_heure
      ? new Date(anomalie.date_heure).toISOString().slice(0, 19)
      : '',
    matricule_agent: anomalie.matricule_agent || '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'quantite' || field === 'prix_unitaire') {
        updated.montant_total = parseFloat(updated.quantite || 0) * parseFloat(updated.prix_unitaire || 0);
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!form.id_voyage || !form.point_depart || !form.point_arrivee || !form.type_tarif)
      return setError('Veuillez remplir tous les champs obligatoires (*).');
    setLoading(true);
    try {
      // ── Vérifier doublon avant d'enregistrer ──────────────────────────────
      const dateHeure = form.date_heure ? form.date_heure.replace('T', ' ') : null;
      const checkRes = await axios.post(`${API}/anomalies/verifier`, {
        tickets: [{
          _index: 0,
          id_voyage:       form.id_voyage,
          matricule_agent: form.matricule_agent,
          type_tarif:      form.type_tarif,
          date_heure:      dateHeure,
        }]
      });
      if (checkRes.data.success && checkRes.data.results[0]?.existeVendu) {
        setLoading(false);
        return setError(' Ce ticket existe déjà dans la base (ticket_vendu), enregistrement annulé.');
      }

      const res = await axios.put(`${API}/anomalies/${anomalie.id}/enregistrer`, {
        ...form,
        quantite:      parseInt(form.quantite),
        prix_unitaire: parseInt(form.prix_unitaire),
        montant_total: parseInt(form.montant_total),
        date_heure:    dateHeure,
      });
      if (res.data.success) { onSuccess(); onClose(); }
      else setError(res.data.message || "Erreur lors de l'enregistrement.");
    } catch (err) {
      console.error('❌ Erreur enregistrer:', err);
      setError('Erreur de connexion au serveur.');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 680, width: '95vw', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title"> Corriger l'anomalie #{anomalie.id}</h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 2 }}>
              {anomalie.prenom} {anomalie.nom}
              {anomalie.matricule_agent && ` — Matricule ${anomalie.matricule_agent}`}
              {' — '}{fmtDate(anomalie.date_heure)}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '20px 28px' }}>

          {/* Erreur originale */}
          {anomalie.erreur && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠ Erreur originale :</div>
              <div style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{anomalie.erreur}</div>
            </div>
          )}

          {error && <div className="alert alert-error">⚠ {error}</div>}

          <div className="form-section-title">Informations du ticket</div>

          <div className="form-group">
              <label className="form-label">ID Voyage *</label>
              <input className="form-input" type="number"
                value={form.id_voyage}
                onChange={e => handleChange('id_voyage', e.target.value)} />
            </div>

          <div className="ligne-grid-2">
            <div className="form-group">
              <label className="form-label">Point départ *</label>
              <input className="form-input"
                value={form.point_depart}
                onChange={e => handleChange('point_depart', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Point arrivée *</label>
              <input className="form-input"
                value={form.point_arrivee}
                onChange={e => handleChange('point_arrivee', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Type tarif *</label>
            <select className="form-input" value={form.type_tarif}
              onChange={e => handleChange('type_tarif', e.target.value)}>
              <option value="">-- Choisir --</option>
              <option value="normal">Normal</option>
              <option value="reduit_50">Réduit 50%</option>
              <option value="reduit_75">Réduit 75%</option>
              <option value="gratuit">Gratuit</option>
              <option value="abonnement">Abonnement</option>
            </select>
          </div>

          <div className="ligne-grid-2">
            <div className="form-group">
              <label className="form-label">Quantité</label>
              <input className="form-input" type="number" min="1"
                value={form.quantite}
                onChange={e => handleChange('quantite', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Prix unitaire (ms)</label>
              <input className="form-input" type="number" min="0"
                value={form.prix_unitaire}
                onChange={e => handleChange('prix_unitaire', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Montant total (ms)</label>
            <input className="form-input" type="number" min="0"
              value={form.montant_total}
              onChange={e => handleChange('montant_total', e.target.value)}
              style={{ background: 'var(--green-light)', borderColor: 'rgba(27,107,58,0.3)', fontWeight: 700 }}
            />
          </div>

          <div className="ligne-grid-2">
            <div className="form-group">
              <label className="form-label">Date / Heure</label>
              <input className="form-input" type="datetime-local" step="1"
                value={form.date_heure}
                onChange={e => handleChange('date_heure', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Matricule agent</label>
              <input className="form-input" type="number"
                value={form.matricule_agent}
                onChange={e => handleChange('matricule_agent', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 28px', borderTop: '1px solid var(--gray-200)' }}>
          <button className="btn btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Enregistrement...' : ' Enregistrer dans la base'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL IMPORT EXCEL
// ══════════════════════════════════════════════════════════════════════════════

function ModalImportExcel({ onClose, onSuccess }) {
  const [tickets,      setTickets]      = useState([]);
  const [warnings,     setWarnings]     = useState([]);
  const [matricule,    setMatricule]    = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [verifying,    setVerifying]    = useState(false);
  const [doublons,     setDoublons]     = useState({}); // { index: { existeVendu, existeAnomalie } }
  const [error,        setError]        = useState('');
  const [fileName,     setFileName]     = useState('');
  const [showPreview,  setShowPreview]  = useState(true);
  // matricule manuel si non trouvé dans le fichier
  const [matriculeManuel, setMatriculeManuel] = useState('');

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    // Essayer d'extraire matricule depuis le nom de fichier
    // ex: rapport_journee_complete_2002_16-04-2026.xlsx → 2002
    const matchNom = file.name.match(/(\d{4,6})/);
    let matriculeNom = matchNom ? parseInt(matchNom[1]) : null;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb     = XLSX.read(evt.target.result, { type: 'binary' });
        const result = parseExcelMobile(wb);

        // Priorité: sheet Résumé > nom fichier
        const mat = result.matricule_agent || matriculeNom;
        result.tickets = result.tickets.map(t => ({ ...t, matricule_agent: t.matricule_agent || mat }));

        setTickets(result.tickets);
        setWarnings(result.warnings);
        setMatricule(mat);
        if (mat) setMatriculeManuel(String(mat));
        setError('');
        setDoublons({});
      } catch (err) {
        setError('Erreur de lecture : ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Vérifier doublons dans la base
  const handleVerifier = async (ticketsList) => {
    if (!ticketsList.length) return;
    setVerifying(true);
    try {
      const payload = ticketsList.map((t, i) => ({ ...t, _index: i }));
      const res = await axios.post(`${API}/anomalies/verifier`, { tickets: payload });
      if (res.data.success) {
        const map = {};
        for (const r of res.data.results) {
          map[r.index] = r;
        }
        setDoublons(map);
      }
    } catch { /* silencieux */ }
    setVerifying(false);
  };

  // Mettre à jour matricule dans tous les tickets si modifié manuellement
  const ticketsAvecMatricule = tickets.map(t => ({
    ...t,
    matricule_agent: matriculeManuel ? parseInt(matriculeManuel) : t.matricule_agent,
  }));

  // Lancer la vérification dès qu'on a des tickets et un matricule
  useEffect(() => {
    if (ticketsAvecMatricule.length > 0 && matriculeManuel) {
      handleVerifier(ticketsAvecMatricule);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matriculeManuel, tickets]);

  const handleImport = async () => {
    if (!ticketsAvecMatricule.length)
      return setError('Aucun ticket failed/pending trouvé.');
    if (!matriculeManuel)
      return setError('Veuillez saisir le matricule de l\'agent.');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/anomalies/importer`, { tickets: ticketsAvecMatricule });
      if (res.data.success) {
        onSuccess(`${res.data.inserted} anomalie(s) importée(s) avec succès.`);
        onClose();
      } else setError(res.data.message || 'Erreur importation.');
    } catch { setError('Erreur de connexion au serveur.'); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 720, width: '95vw', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title"> Importer rapport journée (Excel)</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '20px 28px' }}>

          {/* Info format */}
          <div style={{
            background: 'rgba(13,43,94,0.04)', borderRadius: 8,
            padding: '12px 16px', marginBottom: 20,
            border: '1px solid rgba(13,43,94,0.1)', fontSize: '0.82rem',
          }}>
            <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>
              📋 Format — rapport journée de l'app mobile SRTB
            </div>
            <div style={{ color: 'var(--gray-600)', lineHeight: 1.6 }}>
              Sheet <strong>"Tickets"</strong> avec colonnes :
              <strong> #, Date, Heure, Voyage, Départ, Arrivée, Segment, Tarif, Qté, Prix unit. (ms), Total (ms), Sync</strong>
              <br />Seuls les tickets avec <strong>Sync = "failed"</strong> ou <strong>"pending"</strong> seront importés.
            </div>
          </div>

          {warnings.map((w, i) => (
            <div key={i} className="alert alert-error" style={{ marginBottom: 8 }}>⚠ {w}</div>
          ))}
          {error && <div className="alert alert-error">⚠ {error}</div>}

          {/* Fichier */}
          <div className="form-group">
            <label className="form-label">Fichier Excel (.xlsx) — rapport journée</label>
            <input type="file" accept=".xlsx,.xls" className="form-input"
              style={{ padding: '8px 12px', cursor: 'pointer' }}
              onChange={handleFile} />
          </div>

          {/* Matricule agent */}
          <div className="form-group">
            <label className="form-label">
              Matricule agent
              {matricule
                ? <span style={{ color: 'var(--green)', marginLeft: 8, fontSize: '0.78rem' }}>✓ Détecté automatiquement</span>
                : <span style={{ color: 'var(--red)', marginLeft: 8, fontSize: '0.78rem' }}>* Non détecté — saisir manuellement</span>
              }
            </label>
            <input className="form-input" type="number"
              placeholder="Ex: 2002"
              value={matriculeManuel}
              onChange={e => setMatriculeManuel(e.target.value)} />
          </div>

          {/* Résumé après lecture */}
          {tickets.length > 0 && (
            <>
              <div className="alert alert-success">
                ✓ <strong>{tickets.length}</strong> ticket(s) failed/pending dans "{fileName}"
                {Object.values(doublons).filter(d => d.existe).length > 0 && (
                  <span style={{ marginLeft: 12, color: 'var(--red)', fontWeight: 700 }}>
                     {Object.values(doublons).filter(d => d.existe).length} déjà dans la base
                  </span>
                )}
                {verifying && (
                  <span style={{ marginLeft: 12, color: 'var(--gray-400)', fontSize: '0.78rem' }}>
                    🔍 Vérification en cours...
                  </span>
                )}
              </div>

              {/* Aperçu */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div className="form-section-title" style={{ margin: 0 }}>
                    Aperçu ({tickets.length} ticket{tickets.length > 1 ? 's' : ''})
                  </div>
                  <button className="action-btn edit" style={{ fontSize: '0.75rem' }}
                    onClick={() => setShowPreview(!showPreview)}>
                    {showPreview ? '▲ Masquer' : '▼ Afficher'}
                  </button>
                </div>

                {showPreview && (
                  <div style={{ overflowX: 'auto', maxHeight: 260, overflowY: 'auto', border: '1px solid var(--gray-100)', borderRadius: 8 }}>
                    <table className="data-table" style={{ margin: 0, fontSize: '0.78rem' }}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Voyage</th>
                          <th>Départ → Arrivée</th>
                          <th>Tarif</th>
                          <th>Qté</th>
                          <th>Prix unit.</th>
                          <th>Total (ms)</th>
                          <th>Date</th>
                          <th>État</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ticketsAvecMatricule.map((t, i) => {
                          const doublon = doublons[i];
                          const isDoublon = doublon?.existe;
                          return (
                            <tr key={i} style={isDoublon ? { background: 'rgba(190,56,23,0.06)' } : {}}>
                              <td>{i + 1}</td>
                              <td><span className="badge-matricule">#{t.id_voyage}</span></td>
                              <td>
                                <span style={{ color: 'var(--navy)', fontWeight: 500 }}>{t.point_depart}</span>
                                <span style={{ color: 'var(--gray-400)', margin: '0 4px' }}>→</span>
                                <span>{t.point_arrivee}</span>
                              </td>
                              <td>{t.type_tarif}</td>
                              <td style={{ textAlign: 'center' }}>{t.quantite}</td>
                              <td>{fmt(t.prix_unitaire)} ms</td>
                              <td><span className="montant-badge">{fmt(t.montant_total)} ms</span></td>
                              <td style={{ fontSize: '0.72rem', color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>
                                {t.date_heure}
                              </td>
                              <td>
                                {verifying ? (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>...</span>
                                ) : isDoublon ? (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    padding: '2px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
                                    background: 'rgba(190,56,23,0.1)', color: 'var(--red)',
                                    border: '1px solid rgba(190,56,23,0.3)', whiteSpace: 'nowrap',
                                  }}>
                                     {doublon.existeVendu ? 'Déjà vendu' : 'Déjà en anomalie'}
                                  </span>
                                ) : doublon ? (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    padding: '2px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
                                    background: 'rgba(27,107,58,0.1)', color: 'var(--green)',
                                    border: '1px solid rgba(27,107,58,0.3)',
                                  }}>
                                    ✓ Nouveau
                                  </span>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--navy)' }}>
                          <td colSpan={7} style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.75rem', padding: '8px 18px', textTransform: 'uppercase', letterSpacing: 1 }}>
                            Total
                          </td>
                          <td style={{ padding: '8px 18px' }}>
                            <span style={{ background: 'var(--gold)', color: 'var(--navy-dark)', padding: '2px 10px', borderRadius: 20, fontWeight: 700, fontSize: '0.82rem' }}>
                              {fmt(tickets.reduce((s, t) => s + Number(t.montant_total || 0), 0))} ms
                            </span>
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 28px', borderTop: '1px solid var(--gray-200)' }}>
          <button className="btn btn-gray" onClick={onClose}>Annuler</button>
          <button
            className="btn"
            onClick={handleImport}
            disabled={loading || !tickets.length || !matriculeManuel}
          >
            {loading
              ? 'Importation...'
              : ` Importer ${tickets.length > 0 ? `(${tickets.length} ticket${tickets.length > 1 ? 's' : ''})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════════════════════

export default function GestionAnomalies() {
  const [anomalies,    setAnomalies]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [message,      setMessage]      = useState({ text: '', type: '' });
  const [filterStatut, setFilterStatut] = useState('non_traite');
  const [search,       setSearch]       = useState('');
  const [currentPage,  setCurrentPage]  = useState(1);
  const [modalCorrect, setModalCorrect] = useState(null);
  const [showImport,   setShowImport]   = useState(false);

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/anomalies`);
      setAnomalies(res.data.anomalies || []);
    } catch {
      setMessage({ text: 'Erreur de connexion au serveur.', type: 'error' });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAnomalies(); }, [fetchAnomalies]);
  useEffect(() => { setCurrentPage(1); }, [filterStatut, search]);

  const handleIgnorer = async (id) => {
    try {
      const res = await axios.put(`${API}/anomalies/${id}/ignorer`);
      if (res.data.success) {
        setMessage({ text: 'Anomalie ignorée.', type: 'success' });
        fetchAnomalies();
      }
    } catch { setMessage({ text: 'Erreur de connexion.', type: 'error' }); }
  };

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = anomalies.filter(a => {
    const q = search.toLowerCase();
    const matchStatut = !filterStatut || a.statut === filterStatut;
    const matchSearch = !q ||
      String(a.matricule_agent).includes(q) ||
      (a.nom    || '').toLowerCase().includes(q) ||
      (a.prenom || '').toLowerCase().includes(q) ||
      (a.point_depart  || '').toLowerCase().includes(q) ||
      (a.point_arrivee || '').toLowerCase().includes(q) ||
      String(a.id_voyage || '').includes(q);
    return matchStatut && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const nbNonTraite  = anomalies.filter(a => a.statut === 'non_traite').length;
  const nbEnregistre = anomalies.filter(a => a.statut === 'enregistre').length;
  const nbIgnore     = anomalies.filter(a => a.statut === 'ignore').length;
  const totalMs      = anomalies
    .filter(a => a.statut === 'non_traite')
    .reduce((s, a) => s + Number(a.montant_total || 0), 0);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['#', 'Agent', 'Matricule', 'Voyage', 'Départ', 'Arrivée', 'Tarif', 'Qté', 'Prix unit. (ms)', 'Montant (ms)', 'Date', 'Erreur', 'Statut'],
      ...filtered.map((a, i) => [
        i + 1,
        `${a.prenom || ''} ${a.nom || ''}`.trim(),
        a.matricule_agent,
        a.id_voyage,
        a.point_depart,
        a.point_arrivee,
        a.type_tarif,
        a.quantite,
        a.prix_unitaire,
        a.montant_total,
        fmtDate(a.date_heure),
        a.erreur,
        a.statut,
      ]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Anomalies');
    XLSX.writeFile(wb, `anomalies_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div>
      <Notification message={message} onDone={() => setMessage({ text: '', type: '' })} />

      {modalCorrect && (
        <ModalCorrection
          anomalie={modalCorrect}
          onClose={() => setModalCorrect(null)}
          onSuccess={() => {
            setMessage({ text: 'Ticket enregistré dans la base avec succès !', type: 'success' });
            fetchAnomalies();
            setModalCorrect(null);
          }}
        />
      )}

      {showImport && (
        <ModalImportExcel
          onClose={() => setShowImport(false)}
          onSuccess={(msg) => {
            setMessage({ text: msg, type: 'success' });
            fetchAnomalies();
          }}
        />
      )}

      {/* ── Header ── */}
      <div className="breadcrumb">SRTB › Contrôleur › <span>Gestion des anomalies</span></div>
      <div className="page-header">
        <div>
          <div className="page-title">Gestion des anomalies</div>
          <div className="page-subtitle">Correction manuelle des tickets non synchronisés</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-gold" onClick={() => setShowImport(true)}>
            Importer rapport Excel
          </button>
          <button className="btn btn-gray" onClick={handleExport}>
            ⬇ Exporter
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="kpi-controleur-grid">
        <div className="kpi-controleur-card red" style={{ cursor: 'pointer' }}
          onClick={() => setFilterStatut('non_traite')}>
          
          <div className="kpi-ctrl-body">
            <div className="kpi-ctrl-value">{nbNonTraite}</div>
            <div className="kpi-ctrl-label">Non traités</div>
          </div>
        </div>
        <div className="kpi-controleur-card green" style={{ cursor: 'pointer' }}
          onClick={() => setFilterStatut('enregistre')}>
          
          <div className="kpi-ctrl-body">
            <div className="kpi-ctrl-value">{nbEnregistre}</div>
            <div className="kpi-ctrl-label">Enregistrés</div>
          </div>
        </div>
        <div className="kpi-controleur-card navy" style={{ cursor: 'pointer' }}
          onClick={() => setFilterStatut('ignore')}>
          
          <div className="kpi-ctrl-body">
            <div className="kpi-ctrl-value">{nbIgnore}</div>
            <div className="kpi-ctrl-label">Ignorés</div>
          </div>
        </div>
        <div className="kpi-controleur-card gold">
          
          <div className="kpi-ctrl-body">
            <div className="kpi-ctrl-value" style={{ fontSize: '1.1rem' }}>
              {(totalMs / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT
            </div>
            <div className="kpi-ctrl-label">Montant non traité</div>
          </div>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 24px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="search-input"
            style={{ margin: 0, flex: 1, minWidth: 200 }}
            placeholder="Rechercher par agent, voyage, trajet..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {['', 'non_traite', 'enregistre', 'ignore'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatut(s)}
              style={{
                padding: '7px 16px', borderRadius: 20, cursor: 'pointer',
                border: filterStatut === s ? 'none' : '1px solid var(--gray-200)',
                background: filterStatut === s ? 'var(--navy)' : 'transparent',
                color: filterStatut === s ? '#fff' : 'var(--gray-600)',
                fontWeight: filterStatut === s ? 700 : 400,
                fontSize: '0.82rem', whiteSpace: 'nowrap',
              }}
            >
              {s === ''            ? `Tous (${anomalies.length})`
               : s === 'non_traite'  ? ` Non traités (${nbNonTraite})`
               : s === 'enregistre'  ? ` Enregistrés (${nbEnregistre})`
               :                       `Ignorés (${nbIgnore})`}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 10 }}>
          <strong style={{ color: 'var(--navy)' }}>{filtered.length}</strong> anomalie(s) trouvée(s)
        </p>
      </div>

      {/* ── Tableau ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>
            {anomalies.length === 0
              ? '📥 Aucune anomalie, importez un rapport Excel pour commencer.'
              : 'Aucune anomalie ne correspond aux filtres.'}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Agent</th>
                    <th>Voyage</th>
                    <th>Trajet</th>
                    <th>Tarif</th>
                    <th>Qté</th>
                    <th>Montant</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((a) => (
                    <tr key={a.id} style={a.statut === 'enregistre' ? { opacity: 0.55 } : {}}>
                      <td style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>#{a.id}</td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: '0.87rem' }}>
                          {a.prenom} {a.nom}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>
                          {a.matricule_agent || '—'}
                        </div>
                      </td>
                      <td><span className="badge-matricule">#{a.id_voyage || '—'}</span></td>
                      <td style={{ fontSize: '0.87rem' }}>
                        <span style={{ color: 'var(--navy)', fontWeight: 500 }}>{a.point_depart || '—'}</span>
                        <span style={{ color: 'var(--gray-400)', margin: '0 4px' }}>→</span>
                        <span>{a.point_arrivee || '—'}</span>
                      </td>
                      <td>
                        <span className="badge-role informatique" style={{ fontSize: '0.72rem' }}>
                          {a.type_tarif || '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{a.quantite || 0}</td>
                      <td>
                        {Number(a.montant_total) > 0
                          ? <span className="montant-badge">{fmt(a.montant_total)} ms</span>
                          : <span style={{ color: 'var(--green)', fontWeight: 600 }}>Gratuit</span>
                        }
                      </td>
                      <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', color: 'var(--gray-600)' }}>
                        {fmtDate(a.date_heure)}
                      </td>
                      <td><StatutBadge statut={a.statut} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                          {a.statut === 'non_traite' && (
                            <>
                              <button
                                className="btn"
                                style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                                onClick={() => setModalCorrect(a)}
                              >
                                 Corriger
                              </button>
                              <button
                                className="action-btn edit"
                                style={{ fontSize: '0.75rem' }}
                                onClick={() => handleIgnorer(a.id)}
                              >
                                Ignorer
                              </button>
                            </>
                          )}
                          {a.statut === 'enregistre' && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--green)', fontWeight: 600 }}>
                               Enregistré
                            </span>
                          )}
                          {a.statut === 'ignore' && (
                            <button
                              className="action-btn edit"
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => setModalCorrect(a)}
                            >
                               Retraiter
                            </button>
                          )}
                        </div>
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
              padding: '10px 16px', borderTop: '1px solid var(--gray-100)',
              fontSize: '12px', color: 'var(--gray-400)', textAlign: 'center',
            }}>
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} sur {filtered.length} anomalie(s)
            </div>
          </>
        )}
      </div>
    </div>
  );
}