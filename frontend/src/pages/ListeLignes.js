import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Pagination from '../components/Pagination';
import Notification from '../components/Notification';
import '../styles/global.css';


const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const ITEMS_PER_PAGE = 10;
const EMPTY_SEG = { point_a: '', point_b: '', prix_normal: '' };

/* ─────────────────────────── AutoComplete ─────────────────────────── */
function AutoComplete({ value, onChange, suggestions, placeholder, inputRef }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()));

  return (
    <div ref={ref} className="autocomplete-wrapper">
      <input
        ref={inputRef}
        className="form-input"
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (suggestions.length) setOpen(true); }}
      />
      {open && filtered.length > 0 && (
        <ul className="autocomplete-list">
          {filtered.map((s, i) => (
            <li key={i} className="autocomplete-item"
              onMouseDown={() => { onChange(s); setOpen(false); }}
            >{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────────── OrdreArrets ──────────────────────────── */
function OrdreArrets({ arrets, setArrets, pointsSuggestions, error }) {
  const [newArret, setNewArret] = useState('');

  const ajouter = () => {
    const val = newArret.trim();
    if (!val || arrets.includes(val)) return;
    setArrets(prev => [...prev, val]);
    setNewArret('');
  };
  const supprimer = (i) => setArrets(prev => prev.filter((_, j) => j !== i));
  const monter = (i) => {
    if (i === 0) return;
    setArrets(prev => { const n = [...prev]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; });
  };
  const descendre = (i) => {
    setArrets(prev => {
      if (i === prev.length - 1) return prev;
      const n = [...prev]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n;
    });
  };

  return (
    <div>
      {error && <div className="alert alert-error">⚠ {error}</div>}
      <div className="segment-add-grid" style={{ gridTemplateColumns: '1fr auto' }}>
        <div className="form-group">
          <label className="form-label">Ajouter un arrêt</label>
          <AutoComplete
            value={newArret} onChange={setNewArret}
            suggestions={pointsSuggestions.filter(p => !arrets.includes(p))}
            placeholder="Ex: Aousja"
          />
        </div>
        <button className="btn segment-add-btn" onClick={ajouter}>➕ Ajouter</button>
      </div>
      {arrets.length > 0 ? (
        <table className="data-table">
          <thead><tr><th>#</th><th>Arrêt</th><th>Actions</th></tr></thead>
          <tbody>
            {arrets.map((a, i) => (
              <tr key={i}>
                <td><span className="badge-matricule">{i + 1}</span></td>
                <td>{a}</td>
                <td>
                  <button className="action-btn edit" onClick={() => monter(i)} disabled={i === 0}>Haut ▲</button>
                  <button className="action-btn edit" onClick={() => descendre(i)} disabled={i === arrets.length - 1}>▼ Bas</button>
                  <button className="action-btn delete" onClick={() => supprimer(i)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="receveur-empty">Aucun arrêt défini — ajoutez les arrêts dans l'ordre du trajet</div>
      )}
      {arrets.length > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px',
          marginTop: '12px', padding: '10px',
          background: 'var(--bg-secondary,#f5f5f5)', borderRadius: '8px'
        }}>
          {arrets.map((a, i) => (
            <React.Fragment key={i}>
              <span style={{
                padding: '4px 10px', background: 'var(--primary,#1a73e8)', color: '#fff',
                borderRadius: '20px', fontSize: '12px', fontWeight: 600
              }}>{a}</span>
              {i < arrets.length - 1 && <span style={{ color: 'var(--text-muted,#999)', fontSize: '16px' }}>→</span>}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── TableauSegments ──────────────────────────── */
function TableauSegments({ segments, points, onUpdate, onDelete }) {
  const [editIndex, setEditIndex] = useState(-1);
  const [editSeg, setEditSeg] = useState(EMPTY_SEG);

  const startEdit  = (i) => { setEditIndex(i); setEditSeg({ ...segments[i] }); };
  const cancelEdit = ()  => { setEditIndex(-1); setEditSeg(EMPTY_SEG); };
  const saveEdit   = ()  => {
    if (!editSeg.point_a || !editSeg.point_b || editSeg.point_a === editSeg.point_b) return;
    onUpdate(editIndex, { ...editSeg, prix_normal: parseInt(editSeg.prix_normal) || 0 });
    cancelEdit();
  };

  if (!segments.length) return <div className="receveur-empty">Aucun segment ajouté</div>;

  return (
    <table className="data-table">
      <thead>
        <tr><th>#</th><th>Point A</th><th>Point B</th><th>Normal (m)</th><th>50%</th><th>75%</th><th>Actions</th></tr>
      </thead>
      <tbody>
        {segments.map((s, i) => {
          const isEdit = editIndex === i;
          const seg    = isEdit ? editSeg : s;
          return (
            <tr key={i}>
              <td><span className="badge-matricule">{i + 1}</span></td>
              <td>{isEdit
                ? <AutoComplete value={editSeg.point_a} suggestions={points} placeholder="Point A"
                    onChange={v => setEditSeg(e => ({ ...e, point_a: v }))} />
                : s.point_a}
              </td>
              <td>{isEdit
                ? <AutoComplete value={editSeg.point_b} suggestions={points} placeholder="Point B"
                    onChange={v => setEditSeg(e => ({ ...e, point_b: v }))} />
                : s.point_b}
              </td>
              <td>
                <input type="number" min="0" step="100" className="prix-input"
                  value={seg.prix_normal}
                  onChange={e => isEdit
                    ? setEditSeg(ev => ({ ...ev, prix_normal: e.target.value }))
                    : onUpdate(i, { ...s, prix_normal: parseInt(e.target.value) || 0 })
                  }
                />
              </td>
              <td>{Math.round(seg.prix_normal / 2)} m</td>
              <td>{Math.round(seg.prix_normal / 4)} m</td>
              <td>
                {isEdit ? (
                  <>
                    <button className="action-btn edit" onClick={saveEdit}>✓ Sauver</button>
                    <button className="action-btn delete" onClick={cancelEdit}>✕</button>
                  </>
                ) : (
                  <>
                    <button className="action-btn edit" onClick={() => startEdit(i)}>modifier</button>
                    <button className="action-btn delete" onClick={() => onDelete(i)}>supprimer</button>
                  </>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ──────────────────────── FormulaireSegment ────────────────────────── */
function FormulaireSegment({ newSeg, setNewSeg, points, onAjouter, error }) {
  const pointARef = useRef(null);
  const handleAjouter = () => { onAjouter(); setTimeout(() => pointARef.current?.focus(), 50); };

  return (
    <>
      {error && <div className="alert alert-error">⚠ {error}</div>}
      <div className="segment-add-grid">
        <div className="form-group">
          <label className="form-label">Point A (départ)</label>
          <AutoComplete value={newSeg.point_a} placeholder="Ex: Bizerte"
            onChange={v => setNewSeg(s => ({ ...s, point_a: v }))}
            suggestions={points} inputRef={pointARef} />
        </div>
        <div className="form-group">
          <label className="form-label">Point B (arrivée)</label>
          <AutoComplete value={newSeg.point_b} placeholder="Ex: Mateur"
            onChange={v => setNewSeg(s => ({ ...s, point_b: v }))} suggestions={points} />
        </div>
        <div className="form-group">
          <label className="form-label">Prix Normal (millimes)</label>
          <input className="form-input" placeholder="Ex: 1000" type="number" min="0" step="100"
            value={newSeg.prix_normal}
            onChange={e => setNewSeg(s => ({ ...s, prix_normal: e.target.value }))} />
        </div>
        <button className="btn segment-add-btn" onClick={handleAjouter}>➕ Ajouter</button>
      </div>
    </>
  );
}

/* ──────────────────────────── Helpers ──────────────────────────────── */
const validerSegment = (seg, list, setErr) => {
  const { point_a, point_b, prix_normal } = seg;
  if (!point_a || !point_b || !prix_normal)                            return setErr('Veuillez remplir tous les champs.');
  if (point_a === point_b)                                             return setErr('Point A et Point B doivent être différents.');
  if (list.find(s => s.point_a === point_a && s.point_b === point_b)) return setErr('Ce segment existe déjà.');
  return true;
};

const updateList = (setList, i, seg) =>
  setList(prev => prev.map((s, j) => j === i ? seg : s));

const autoDetectArrets = (segments) => {
  const seen = new Set();
  const order = [];
  for (const s of segments) {
    if (!seen.has(s.point_a)) { seen.add(s.point_a); order.push(s.point_a); }
    if (!seen.has(s.point_b)) { seen.add(s.point_b); order.push(s.point_b); }
  }
  return order;
};

const validateArretsForSubmit = (arrets, segments, label) => {
  if (arrets.length < 2)
    return `${label}: Définissez au moins 2 arrêts dans l'ordre correct.`;
  const arretSet  = new Set(arrets.map(a => a.trim().toLowerCase()));
  const allPoints = [...new Set(segments.flatMap(s => [s.point_a, s.point_b]))];
  for (const point of allPoints) {
    if (!arretSet.has(point.trim().toLowerCase()))
      return `${label}: L'arrêt "${point}" est présent dans les tarifs mais absent de la liste d'arrêts.`;
  }
  return null;
};

/* ──────────────────────── ModalModifierLigne ───────────────────────── */
function ModalModifierLigne({ ligne, onClose, onSaved, onNotify }) {
  const [nomLigne,    setNomLigne]    = useState(ligne.nom_ligne);
  const [pointDepart, setPointDepart] = useState(ligne.point_depart);
  const [pointArrive, setPointArrive] = useState(ligne.point_arrive);
  const [segments,    setSegments]    = useState([]);
  const [arrets,      setArrets]      = useState([]);
  const [newSeg,      setNewSeg]      = useState(EMPTY_SEG);
  const [errors,      setErrors]      = useState({ segment: '', arrets: '' });
  const [inlineMsg,   setInlineMsg]   = useState({ text: '', type: '' });
  const [loading,     setLoading]     = useState(false);
  const [initDone,    setInitDone]    = useState(false);

  useEffect(() => {
    const id = ligne.id_ligne;
    axios.get(`${API}/api/tarifs_ligne/${id}`)
      .then(res => {
        if (res.data.success)
          setSegments(res.data.tarifs.map(t => ({ point_a: t.point_a, point_b: t.point_b, prix_normal: t.prix_normal })));
      })
      .catch(console.error);

    axios.get(`${API}/api/segments_ligne/${id}`)
      .then(res => {
        if (res.data.success && res.data.segments.length > 0) {
          const seen = new Set();
          const order = [];
          for (const seg of res.data.segments) {
            if (!seen.has(seg.point_depart))  { seen.add(seg.point_depart);  order.push(seg.point_depart); }
            if (!seen.has(seg.point_arrivee)) { seen.add(seg.point_arrivee); order.push(seg.point_arrivee); }
          }
          setArrets(order);
        }
        setInitDone(true);
      })
      .catch(() => setInitDone(true));
  }, [ligne.id_ligne]);

  useEffect(() => {
    if (initDone && arrets.length === 0 && segments.length > 0)
      setArrets(autoDetectArrets(segments));
  }, [initDone, segments]);

  const points = [...new Set(segments.flatMap(s => [s.point_a, s.point_b]))];

  const ajouterSegment = () => {
    const setErr = (msg) => setErrors(e => ({ ...e, segment: msg }));
    if (!validerSegment(newSeg, segments, setErr)) return;
    setErr('');
    setSegments(prev => [...prev, { ...newSeg, prix_normal: parseInt(newSeg.prix_normal) }]);
    setNewSeg(EMPTY_SEG);
  };

  const handleSubmit = async () => {
    if (!nomLigne || !pointDepart || !pointArrive)
      return setInlineMsg({ text: 'Veuillez remplir tous les champs obligatoires.', type: 'error' });
    if (!segments.length)
      return setInlineMsg({ text: 'Ajoutez au moins un segment.', type: 'error' });
    const errArrets = validateArretsForSubmit(arrets, segments, 'Arrêts');
    if (errArrets) return setInlineMsg({ text: errArrets, type: 'error' });

    setLoading(true);
    try {
      const res = await axios.put(`${API}/api/lignes/${ligne.id_ligne}`, {
        nom_ligne:    nomLigne,
        point_depart: pointDepart,
        point_arrive: pointArrive,
        segments,
        arrets_ordre: arrets,
      });
      if (res.data.success) {
        onNotify({ text: `Ligne "${nomLigne}" modifiée avec succès !`, type: 'success' });
        setTimeout(() => onSaved(), 300);
      } else {
        setInlineMsg({ text: res.data.message || 'Erreur lors de la modification.', type: 'error' });
      }
    } catch {
      setInlineMsg({ text: 'Erreur de connexion au serveur.', type: 'error' });
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 860, width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title"> Modifier la ligne — {ligne.nom_ligne}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {inlineMsg.text && (
          <div className={`alert ${inlineMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}
               style={{ margin: '0 0 16px' }}>
            {inlineMsg.type === 'success' ? '✓' : '⚠'} {inlineMsg.text}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div className="form-section-title">Informations de la ligne</div>
          <div className="form-group">
            <label className="form-label">Nom de la ligne *</label>
            <input className="form-input" value={nomLigne} onChange={e => setNomLigne(e.target.value)} />
          </div>
          <div className="ligne-grid-2">
            <div className="form-group">
              <label className="form-label">Point de départ *</label>
              <input className="form-input" value={pointDepart} onChange={e => setPointDepart(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Point d'arrivée *</label>
              <input className="form-input" value={pointArrive} onChange={e => setPointArrive(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="form-section-title">
            Segments — Tarifs
            <span className="segment-count"> ({segments.length} segment{segments.length !== 1 ? 's' : ''})</span>
          </div>
          <FormulaireSegment
            newSeg={newSeg} setNewSeg={setNewSeg} points={points}
            error={errors.segment} onAjouter={ajouterSegment}
          />
          <TableauSegments
            segments={segments} points={points}
            onUpdate={(i, seg) => updateList(setSegments, i, seg)}
            onDelete={i => setSegments(prev => prev.filter((_, j) => j !== i))}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="form-section-title">
            Ordre des arrêts
            <span className="segment-count"> ({arrets.length} arrêt{arrets.length !== 1 ? 's' : ''})</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted,#888)', marginBottom: '12px' }}>
            Définissez l'ordre exact des arrêts. C'est cet ordre qui sera utilisé pour ouvrir/clôturer les segments lors du voyage.
          </p>
          <OrdreArrets
            arrets={arrets} setArrets={setArrets}
            pointsSuggestions={points} error={errors.arrets}
          />
        </div>

      

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8, borderTop: '1px solid var(--border,#e0e0e0)' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Annuler</button>
          <button className="btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Enregistrement...' : '✓ Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────── ConfirmDeleteModal ───────────────────────── */
function ConfirmDeleteModal({ ligne, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" style={{ maxWidth: 420, width: '90vw' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title"> Supprimer la ligne</h2>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <p style={{ margin: '16px 0', fontSize: '14px', color: 'var(--color-text-primary)' }}>
          Êtes-vous sûr de vouloir supprimer la ligne <strong>{ligne.nom_ligne}</strong> ?<br />
          <span style={{ color: 'var(--red,#e53935)', fontSize: '13px' }}>
            ⚠ Cette action est irréversible. Tous les segments et arrêts associés seront supprimés.
          </span>
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>Annuler</button>
          <button
            className="btn"
            style={{ background: 'var(--red,#e53935)', borderColor: 'var(--red,#e53935)' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Suppression...' : ' Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────── ListeLignes ──────────────────────────── */
export default function ListeLignes() {
  const [lignes,         setLignes]         = useState([]);
  const [expanded,       setExpanded]       = useState({});
  const [search,         setSearch]         = useState('');
  const [ligneAModifier, setLigneAModifier] = useState(null);
  const [ligneASuppr,    setLigneASuppr]    = useState(null);
  const [deleteLoading,  setDeleteLoading]  = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [notification,   setNotification]   = useState({ text: '', type: '' });
  const [currentPage,    setCurrentPage]    = useState(1);
  const navigate = useNavigate();

  const fetchLignes = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/lignes_avec_segments`)
      .then(res => setLignes(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLignes(); }, [fetchLignes]);

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const filtered = lignes.filter(l =>
    [l.nom_ligne, l.point_depart, l.point_arrive].some(v =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  useEffect(() => { setCurrentPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIdx   = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated  = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const handleDelete = async () => {
    if (!ligneASuppr) return;
    setDeleteLoading(true);
    try {
      const res = await axios.delete(`${API}/api/lignes/${ligneASuppr.id_ligne}`);
      if (res.data.success) {
        setNotification({ text: `Ligne "${ligneASuppr.nom_ligne}" supprimée avec succès.`, type: 'success' });
        fetchLignes();
      } else {
        setNotification({ text: res.data.message || 'Erreur lors de la suppression.', type: 'error' });
      }
    } catch {
      setNotification({ text: 'Erreur de connexion au serveur.', type: 'error' });
    }
    setDeleteLoading(false);
    setLigneASuppr(null);
  };

  return (
    <div>
      <Notification
        message={notification}
        onDone={() => setNotification({ text: '', type: '' })}
      />

      <div className="breadcrumb">
        Accueil / <span>Lignes de transport</span>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Lignes de transport</h1>
          <p className="page-subtitle">Gestion des lignes et segments tarifaires</p>
        </div>
        <button className="btn" onClick={() => navigate('/ajouter-ligne')}>
          + Ajouter une ligne
        </button>
      </div>

      <div className="card">
        <input
          className="search-input"
          type="text"
          placeholder="Rechercher par nom, départ ou arrivée..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', marginBottom: 16 }}>
          {filtered.length} ligne{filtered.length !== 1 ? 's' : ''} trouvée{filtered.length !== 1 ? 's' : ''}
        </p>

        {loading && (
          <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 40 }}>Chargement...</p>
        )}

        {paginated.map(ligne => (
          <div key={ligne.id_ligne} className="receveur-card">
            <div
              className={`receveur-header ${expanded[ligne.id_ligne] ? 'expanded' : ''}`}
              onClick={() => toggle(ligne.id_ligne)}
            >
              <div className="receveur-avatar" style={{ fontSize: '0.85rem' }}>
                {ligne.nom_ligne.charAt(0)}
              </div>
              <div className="receveur-info">
                <div className="receveur-nom">{ligne.nom_ligne}</div>
                <div className="receveur-matricule">
                   {ligne.point_depart} → {ligne.point_arrive}
                </div>
              </div>
              <div className="receveur-badges">
                <span className="badge-role informatique">
                  {ligne.segments.length} segment{ligne.segments.length !== 1 ? 's' : ''}
                </span>
                <button
                  className="action-btn edit"
                  onClick={e => { e.stopPropagation(); setLigneAModifier(ligne); }}
                >
                   Modifier
                </button>
                <button
                  className="action-btn delete"
                  onClick={e => { e.stopPropagation(); setLigneASuppr(ligne); }}
                >
                   Supprimer
                </button>
              </div>
              <span className={`receveur-arrow ${expanded[ligne.id_ligne] ? 'open' : ''}`}>▼</span>
            </div>

            {expanded[ligne.id_ligne] && (
              <div className="receveur-body">
                {ligne.segments.length === 0 ? (
                  <p className="receveur-empty">Aucun segment enregistré pour cette ligne.</p>
                ) : (
                  <table className="data-table" style={{ marginTop: 8 }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Départ</th>
                        <th>Arrivée</th>
                        <th>Prix Normal (DT)</th>
                        <th>Réduit 50%</th>
                        <th>Réduit 75%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ligne.segments.map((seg, i) => (
                        <tr key={seg.id}>
                          <td><span className="badge-matricule">{i + 1}</span></td>
                          <td>{seg.point_a}</td>
                          <td>{seg.point_b}</td>
                          <td><span className="montant-badge">{Number(seg.prix_normal).toFixed(3)}</span></td>
                          <td style={{ color: 'var(--gold)', fontWeight: 600 }}>
                            {Number(seg.prix_reduit_50).toFixed(3)}
                          </td>
                          <td style={{ color: 'var(--red)', fontWeight: 600 }}>
                            {Number(seg.prix_reduit_75).toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <table className="data-table">
            <tbody>
              <tr className="empty-row"><td colSpan={6}>Aucune ligne trouvée.</td></tr>
            </tbody>
          </table>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {filtered.length > 0 && (
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--color-border-tertiary)',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            textAlign: 'center'
          }}>
            {startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, filtered.length)} sur {filtered.length} ligne{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {ligneAModifier && (
        <ModalModifierLigne
          ligne={ligneAModifier}
          onClose={() => setLigneAModifier(null)}
          onNotify={setNotification}
          onSaved={() => { fetchLignes(); setLigneAModifier(null); }}
        />
      )}

      {ligneASuppr && (
        <ConfirmDeleteModal
          ligne={ligneASuppr}
          onConfirm={handleDelete}
          onCancel={() => setLigneASuppr(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}