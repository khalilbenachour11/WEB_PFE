import React, { useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function ModalModifierLigne({ ligne, onClose, onSaved }) {
  const [nomLigne, setNomLigne]       = useState(ligne.nom_ligne);
  const [pointDepart, setPointDepart] = useState(ligne.point_depart);
  const [pointArrive, setPointArrive] = useState(ligne.point_arrive);
  const [segments, setSegments]       = useState(
    ligne.segments.map(s => ({ point_a: s.point_a, point_b: s.point_b, prix_normal: s.prix_normal }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Points existants pour autocomplétion
  const allPoints = [...new Set(segments.flatMap(s => [s.point_a, s.point_b]).filter(Boolean))];

  const updateSegment = (i, field, value) => {
    const updated = [...segments];
    updated[i] = { ...updated[i], [field]: value };
    setSegments(updated);
  };

  const inverserSegment = (i) => {
    const updated = [...segments];
    const { point_a, point_b } = updated[i];
    updated[i] = { ...updated[i], point_a: point_b, point_b: point_a };
    setSegments(updated);
  };

  const ajouterSegment = () => {
    const dernierB = segments.length > 0 ? segments[segments.length - 1].point_b : '';
    setSegments([...segments, { point_a: dernierB, point_b: '', prix_normal: '' }]);
  };

  const supprimerSegment = (i) => setSegments(segments.filter((_, idx) => idx !== i));

  const valider = () => {
    if (!nomLigne.trim() || !pointDepart.trim() || !pointArrive.trim())
      return 'Remplissez tous les champs de la ligne.';
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (!s.point_a || !s.point_b || !s.prix_normal)
        return `Segment ${i + 1} : champs incomplets.`;
      if (s.point_a === s.point_b)
        return `Segment ${i + 1} : départ et arrivée identiques.`;
      const doublon = segments.some((o, j) => j !== i && o.point_a === s.point_a && o.point_b === s.point_b);
      if (doublon) return `Segment ${i + 1} : doublon (${s.point_a} → ${s.point_b}).`;
    }
    return null;
  };

  const handleSave = async () => {
    const err = valider();
    if (err) return setError(err);
    setLoading(true);
    setError('');
    try {
      await axios.put(`${API}/api/lignes/${ligne.id_ligne}`, {
        nom_ligne: nomLigne, point_depart: pointDepart,
        point_arrive: pointArrive, segments
      });
      onSaved();
      onClose();
    } catch {
      setError('Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-box"
        style={{ maxWidth: 860, textAlign: 'left', padding: '32px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>✏️ Modifier la ligne</h3>
          <button className="btn btn-gray" style={{ padding: '6px 14px' }} onClick={onClose}>✕</button>
        </div>

        {/* Infos ligne */}
        <p className="form-section-title">Informations de la ligne</p>
        <div className="ligne-grid-2" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 24 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Nom de la ligne</label>
            <input className="form-input" value={nomLigne} onChange={e => setNomLigne(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Point de départ</label>
            <input className="form-input" value={pointDepart} onChange={e => setPointDepart(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Point d'arrivée</label>
            <input className="form-input" value={pointArrive} onChange={e => setPointArrive(e.target.value)} />
          </div>
        </div>

        {/* Header segments */}
        <div className="section-header">
          <p className="form-section-title" style={{ margin: 0 }}>
            Segments tarifaires
            <span className="segment-count">({segments.length} segment{segments.length !== 1 ? 's' : ''})</span>
          </p>
          <button className="btn btn-gold btn-generer" onClick={ajouterSegment}>
            + Ajouter segment
          </button>
        </div>

        {/* Liste segments */}
        <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 12 }}>
          {segments.length === 0 && (
            <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: '20px 0', fontSize: '0.88rem' }}>
              Aucun segment. Cliquez sur "Ajouter segment".
            </p>
          )}

          {segments.map((seg, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr 24px 1fr 120px 90px 90px auto auto',
                alignItems: 'center',
                gap: 8,
                background: 'var(--offwhite)',
                borderRadius: 8,
                padding: '8px 12px',
                marginBottom: 8
              }}
            >
              {/* Numéro */}
              <span style={{ color: 'var(--gray-400)', fontSize: '0.82rem', fontWeight: 600 }}>{i + 1}</span>

              {/* Point A */}
              <input
                list={`pa-${i}`}
                className="form-input"
                style={{ padding: '7px 10px', fontSize: '0.85rem' }}
                placeholder="Départ"
                value={seg.point_a}
                onChange={e => updateSegment(i, 'point_a', e.target.value)}
              />
              <datalist id={`pa-${i}`}>
                {allPoints.map(p => <option key={p} value={p} />)}
              </datalist>

              <span style={{ textAlign: 'center', color: 'var(--gray-400)' }}>→</span>

              {/* Point B */}
              <input
                list={`pb-${i}`}
                className="form-input"
                style={{ padding: '7px 10px', fontSize: '0.85rem' }}
                placeholder="Arrivée"
                value={seg.point_b}
                onChange={e => updateSegment(i, 'point_b', e.target.value)}
              />
              <datalist id={`pb-${i}`}>
                {allPoints.map(p => <option key={p} value={p} />)}
              </datalist>

              {/* Prix normal */}
              <input
                type="number"
                className="form-input"
                style={{ padding: '7px 10px', fontSize: '0.85rem' }}
                placeholder="Prix (m)"
                value={seg.prix_normal}
                min="0" step="100"
                onChange={e => updateSegment(i, 'prix_normal', e.target.value)}
              />

              {/* Prix calculés */}
              <span className="badge-role direction" style={{ textAlign: 'center', fontSize: '0.78rem' }}>
                {seg.prix_normal ? (seg.prix_normal * 0.5).toFixed(3) : '—'}
              </span>
              <span className="badge-role red" style={{ textAlign: 'center', fontSize: '0.78rem' }}>
                {seg.prix_normal ? (seg.prix_normal * 0.25).toFixed(3) : '—'}
              </span>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="action-btn edit"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  title="Inverser"
                  onClick={() => inverserSegment(i)}
                >⇄</button>
                <button
                  className="action-btn delete"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  title="Supprimer"
                  onClick={() => supprimerSegment(i)}
                >✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* Légende */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: '0.78rem' }}>
          <span className="badge-role direction">Réduit 50%</span>
          <span className="badge-role red">Réduit 75%</span>
        </div>

        {/* Erreur */}
        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {/* Footer */}
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn" onClick={handleSave} disabled={loading}>
            {loading ? 'Enregistrement...' : '💾 Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}