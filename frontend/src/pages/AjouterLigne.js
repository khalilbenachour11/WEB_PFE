import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import '../styles/global.css';
import Notification from '../components/Notification';

const API       = 'http://localhost:5000/api';
const EMPTY_SEG  = { point_a: '', point_b: '', prix_normal: '' };
const EMPTY_FORM = { nom_ligne: '', point_depart: '', point_arrive: '', code_agence: '' };

// ─────────────────────────────────────────────
// AutoComplete générique (points / arrêts)
// ─────────────────────────────────────────────
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
              onMouseDown={() => { onChange(s); setOpen(false); }}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SelectAgence — liste déroulante complète
// ─────────────────────────────────────────────
function SelectAgence({ value, onSelect }) {
  const [agences, setAgences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/agences`)
      .then(res => setAgences(res.data.agences || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const code = e.target.value;
    if (!code) { onSelect({ code_agence: '', nom_agence: '' }); return; }
    const ag = agences.find(a => String(a.code_agence) === code);
    if (ag) onSelect(ag);
  };

  return (
    <select className="form-input" value={value} onChange={handleChange} disabled={loading}>
      <option value="">{loading ? 'Chargement des agences...' : 'Sélectionner une agence '}</option>
      {agences.map(ag => (
        <option key={ag.code_agence} value={String(ag.code_agence)}>
          {ag.code_agence} — {ag.nom_agence}
        </option>
      ))}
    </select>
  );
}

// ─────────────────────────────────────────────
// Ordre des arrêts
// ─────────────────────────────────────────────
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
    setArrets(prev => { const n = [...prev]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; });
  };

  const descendre = (i) => {
    setArrets(prev => {
      if (i === prev.length - 1) return prev;
      const n = [...prev]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; return n;
    });
  };

  return (
    <div>
      {error && <div className="alert alert-error">⚠ {error}</div>}
      <div className="segment-add-grid" style={{ gridTemplateColumns: '1fr auto' }}>
        <div className="form-group">
          <label className="form-label">Ajouter un arrêt</label>
          <AutoComplete
            value={newArret}
            onChange={setNewArret}
            suggestions={pointsSuggestions.filter(p => !arrets.includes(p))}
            placeholder="Ex: Aousja"
          />
        </div>
        <button className="btn segment-add-btn" onClick={ajouter}>➕ Ajouter</button>
      </div>

      {arrets.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Arrêt</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {arrets.map((a, i) => (
              <tr key={i}>
                <td><span className="badge-matricule">{i + 1}</span></td>
                <td>{a}</td>
                <td>
                  <button className="action-btn edit"   onClick={() => monter(i)}    disabled={i === 0}> Haut ▲</button>
                  <button className="action-btn edit"   onClick={() => descendre(i)} disabled={i === arrets.length - 1}>▼ Bas</button>
                  <button className="action-btn delete" onClick={() => supprimer(i)}>supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="receveur-empty">Aucun arrêt défini — ajoutez les arrêts dans l'ordre du trajet</div>
      )}

      {arrets.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginTop: '12px', padding: '10px', background: 'var(--bg-secondary,#f5f5f5)', borderRadius: '8px' }}>
          {arrets.map((a, i) => (
            <React.Fragment key={i}>
              <span style={{ padding: '4px 10px', background: 'var(--primary,#1a73e8)', color: '#fff', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{a}</span>
              {i < arrets.length - 1 && <span style={{ color: 'var(--text-muted,#999)', fontSize: '16px' }}>→</span>}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Tableau des segments (avec édition inline)
// ─────────────────────────────────────────────
function TableauSegments({ segments, points, onUpdate, onDelete }) {
  const [editIndex, setEditIndex] = useState(-1);
  const [editSeg,   setEditSeg]   = useState(EMPTY_SEG);

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
              <td>
                {isEdit
                  ? <AutoComplete value={editSeg.point_a} suggestions={points} placeholder="Point A"
                      onChange={v => setEditSeg(e => ({ ...e, point_a: v }))} />
                  : s.point_a}
              </td>
              <td>
                {isEdit
                  ? <AutoComplete value={editSeg.point_b} suggestions={points} placeholder="Point B"
                      onChange={v => setEditSeg(e => ({ ...e, point_b: v }))} />
                  : s.point_b}
              </td>
              <td>
                <input
                  type="number" min="0" step="100" className="prix-input"
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
                    <button className="action-btn edit"   onClick={saveEdit}>✓ Sauver</button>
                    <button className="action-btn delete" onClick={cancelEdit}>✕</button>
                  </>
                ) : (
                  <>
                    <button className="action-btn edit"   onClick={() => startEdit(i)}> Modifier</button>
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

// ─────────────────────────────────────────────
// Formulaire ajout d'un segment
// ─────────────────────────────────────────────
function FormulaireSegment({ newSeg, setNewSeg, points, onAjouter, error }) {
  const pointARef = useRef(null);
  const handleAjouter = () => {
    onAjouter();
    setTimeout(() => pointARef.current?.focus(), 50);
  };

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
            onChange={v => setNewSeg(s => ({ ...s, point_b: v }))}
            suggestions={points} />
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

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const validerSegment = (seg, list, setErr) => {
  const { point_a, point_b, prix_normal } = seg;
  if (!point_a || !point_b || !prix_normal)
    return setErr('Veuillez remplir tous les champs.');
  if (point_a === point_b)
    return setErr('Point A et Point B doivent être différents.');
  if (list.find(s => s.point_a === point_a && s.point_b === point_b))
    return setErr('Ce segment existe déjà.');
  return true;
};

const updateList = (setList, i, seg) =>
  setList(prev => prev.map((s, j) => j === i ? seg : s));

const nomRetour = (nom) =>
  nom.includes('-') ? nom.split('-').reverse().join('-') : `${nom} (Retour)`;

const autoDetectArrets = (segments) => {
  const seen = new Set();
  const order = [];
  for (const s of segments) {
    if (!seen.has(s.point_a)) { seen.add(s.point_a); order.push(s.point_a); }
    if (!seen.has(s.point_b)) { seen.add(s.point_b); order.push(s.point_b); }
  }
  return order;
};

// ─────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────
export default function AjouterLigne() {
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [nomAgence,    setNomAgence]    = useState('');
  const [aller,        setAller]        = useState([]);
  const [retour,       setRetour]       = useState([]);
  const [newAller,     setNewAller]     = useState(EMPTY_SEG);
  const [newRetour,    setNewRetour]    = useState(EMPTY_SEG);
  const [arretsAller,  setArretsAller]  = useState([]);
  const [arretsRetour, setArretsRetour] = useState([]);
  const [errors,       setErrors]       = useState({ aller: '', retour: '', arretsAller: '', arretsRetour: '' });
  const [message,      setMessage]      = useState({ text: '', type: '' });
  const [loading,      setLoading]      = useState(false);

  const pointsAller  = [...new Set(aller.flatMap(s  => [s.point_a, s.point_b]))];
  const pointsRetour = [...new Set(retour.flatMap(s => [s.point_a, s.point_b]))];

  const ajouterSegment = (newSeg, setList, list, sens) => {
    const setErr = (msg) => setErrors(e => ({ ...e, [sens]: msg }));
    if (!validerSegment(newSeg, list, setErr)) return;
    setErr('');
    setList(prev => [...prev, { ...newSeg, prix_normal: parseInt(newSeg.prix_normal) }]);
    sens === 'aller' ? setNewAller(EMPTY_SEG) : setNewRetour(EMPTY_SEG);
  };

  useEffect(() => {
    if (aller.length > 0 && arretsAller.length === 0)
      setArretsAller(autoDetectArrets(aller));
  }, [aller]);

  useEffect(() => {
    if (retour.length > 0 && arretsRetour.length === 0)
      setArretsRetour(autoDetectArrets(retour));
  }, [retour]);

  const genererRetour = () => {
    if (!aller.length) return setErrors(e => ({ ...e, retour: "Ajoutez d'abord des segments aller." }));
    setRetour([...aller].reverse().map(s => ({ point_a: s.point_b, point_b: s.point_a, prix_normal: s.prix_normal })));
    setArretsRetour([...arretsAller].reverse());
    setErrors(e => ({ ...e, retour: '', arretsRetour: '' }));
  };

  const validateArretsForSubmit = (arrets, segments, label) => {
    if (arrets.length < 2)
      return `${label}: Définissez au moins 2 arrêts dans l'ordre correct.`;
    const arretSet = new Set(arrets.map(a => a.trim().toLowerCase()));
    const allPoints = [...new Set(segments.flatMap(s => [s.point_a, s.point_b]))];
    for (const point of allPoints) {
      if (!arretSet.has(point.trim().toLowerCase()))
        return `${label}: L'arrêt "${point}" est présent dans les tarifs mais absent de la liste d'arrêts.`;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!form.nom_ligne || !form.point_depart || !form.point_arrive)
      return setMessage({ text: 'Veuillez remplir tous les champs obligatoires.', type: 'error' });
    if (!aller.length)
      return setMessage({ text: 'Ajoutez au moins un segment aller.', type: 'error' });

    const errAller = validateArretsForSubmit(arretsAller, aller, 'Aller');
    if (errAller) return setMessage({ text: errAller, type: 'error' });

    if (retour.length) {
      const errRetour = validateArretsForSubmit(arretsRetour, retour, 'Retour');
      if (errRetour) return setMessage({ text: errRetour, type: 'error' });
    }

    setLoading(true);
    try {
      const r1 = await axios.post(`${API}/ajouter_ligne`, {
        ...form,
        segments:     aller,
        arrets_ordre: arretsAller,
      });
      if (!r1.data.success) return setMessage({ text: `Aller : ${r1.data.message}`, type: 'error' });

      if (retour.length) {
        const r2 = await axios.post(`${API}/ajouter_ligne`, {
          nom_ligne:    nomRetour(form.nom_ligne),
          point_depart: form.point_arrive,
          point_arrive: form.point_depart,
          code_agence:  form.code_agence,
          segments:     retour,
          arrets_ordre: arretsRetour,
        });
        if (!r2.data.success) return setMessage({ text: `Retour : ${r2.data.message}`, type: 'error' });
      }

      setMessage({ text: retour.length ? 'Lignes aller et retour ajoutées !' : 'Ligne aller ajoutée !', type: 'success' });
      setForm(EMPTY_FORM);
      setNomAgence('');
      setAller([]);
      setRetour([]);
      setArretsAller([]);
      setArretsRetour([]);
    } catch {
      setMessage({ text: 'Erreur de connexion au serveur.', type: 'error' });
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="breadcrumb">SRTB › Direction › <span>Ajouter une ligne</span></div>
      <div className="page-header">
        <div>
          <div className="page-title">Ajouter une ligne</div>
          <div className="page-subtitle">Définir la ligne, ses segments aller/retour et leurs tarifs</div>
        </div>
      </div>

      <Notification message={message} onDone={() => setMessage({ text: '', type: '' })} />

      {/* ── Infos ligne ── */}
      <div className="card">
        <div className="form-section-title">Informations de la ligne</div>
        <div className="form-group">
          <label className="form-label">Nom de la ligne *</label>
          <input className="form-input" placeholder="Ex: Bizerte-Tunis"
            value={form.nom_ligne}
            onChange={e => setForm(f => ({ ...f, nom_ligne: e.target.value }))} />
        </div>
        <div className="ligne-grid-2">
          <div className="form-group">
            <label className="form-label">Point de départ *</label>
            <input className="form-input" placeholder="Ex: Bizerte"
              value={form.point_depart}
              onChange={e => setForm(f => ({ ...f, point_depart: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Point d'arrivée *</label>
            <input className="form-input" placeholder="Ex: Tunis"
              value={form.point_arrive}
              onChange={e => setForm(f => ({ ...f, point_arrive: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Code agence</label>
          <SelectAgence
            value={form.code_agence}
            onSelect={ag => {
              setForm(f => ({ ...f, code_agence: ag.code_agence ? String(ag.code_agence) : '' }));
              setNomAgence(ag.nom_agence || '');
            }}
          />
          {nomAgence && <div className="agence-selected">🏢 {nomAgence}</div>}
        </div>
      </div>

      {/* ── Tarifs ALLER ── */}
      <div className="card">
        <div className="form-section-title">
          🟢 Segments Aller — Tarifs
          <span className="segment-count">({aller.length} segment{aller.length !== 1 ? 's' : ''})</span>
        </div>
        <FormulaireSegment newSeg={newAller} setNewSeg={setNewAller} points={pointsAller}
          error={errors.aller}
          onAjouter={() => ajouterSegment(newAller, setAller, aller, 'aller')} />
        <TableauSegments segments={aller} points={pointsAller}
          onUpdate={(i, seg) => updateList(setAller, i, seg)}
          onDelete={i => setAller(prev => prev.filter((_, j) => j !== i))} />
      </div>

      {/* ── Ordre arrêts ALLER ── */}
      <div className="card">
        <div className="form-section-title">
          🟢 Ordre des arrêts Aller
          <span className="segment-count">({arretsAller.length} arrêt{arretsAller.length !== 1 ? 's' : ''})</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted,#888)', marginBottom: '12px' }}>
          Définissez l'ordre exact des arrêts. C'est cet ordre qui sera utilisé pour ouvrir/clôturer les segments lors du voyage.
        </p>
        <OrdreArrets arrets={arretsAller} setArrets={setArretsAller}
          pointsSuggestions={pointsAller} error={errors.arretsAller} />
      </div>

      {/* ── Tarifs RETOUR ── */}
      <div className="card">
        <div className="section-header">
          <div className="form-section-title">
            🔵 Segments Retour — Tarifs
            <span className="segment-count">({retour.length} segment{retour.length !== 1 ? 's' : ''})</span>
          </div>
          <button className="btn btn-generer" onClick={genererRetour}>⇄ Générer depuis l'aller</button>
        </div>
        <FormulaireSegment newSeg={newRetour} setNewSeg={setNewRetour} points={pointsRetour}
          error={errors.retour}
          onAjouter={() => ajouterSegment(newRetour, setRetour, retour, 'retour')} />
        <TableauSegments segments={retour} points={pointsRetour}
          onUpdate={(i, seg) => updateList(setRetour, i, seg)}
          onDelete={i => setRetour(prev => prev.filter((_, j) => j !== i))} />
      </div>

      {/* ── Ordre arrêts RETOUR ── */}
      {retour.length > 0 && (
        <div className="card">
          <div className="form-section-title">
            🔵 Ordre des arrêts Retour
            <span className="segment-count">({arretsRetour.length} arrêt{arretsRetour.length !== 1 ? 's' : ''})</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted,#888)', marginBottom: '12px' }}>
            Définissez l'ordre exact des arrêts sur la ligne retour.
          </p>
          <OrdreArrets arrets={arretsRetour} setArrets={setArretsRetour}
            pointsSuggestions={pointsRetour} error={errors.arretsRetour} />
        </div>
      )}

   

      <div className="ligne-submit">
        <button className="btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Enregistrement...' : '✓ Enregistrer la ligne'}
        </button>
      </div>
    </div>
  );
}