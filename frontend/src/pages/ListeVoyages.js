import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/global.css";
import Notification from "../components/Notification";

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════════════════════

const API = "http://localhost:5000/api";
const ITEMS_PER_PAGE = 10;

const TYPE_OPTIONS = [
  {
    value: "programmé",
    label: "📅 Programmé",
    desc: "Planifié à l'avance",
    bgLight: "#e8f0fe",
    border: "#1a73e8",
    text: "#1a73e8",
  },
  {
    value: "non programmé",
    label: "⚡ Non programmé",
    desc: "Immédiat / imprévu",
    bgLight: "#fffbeb",
    border: "#f59e0b",
    text: "#92400e",
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════════════════════════════════════

const formatDate = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleString("fr-TN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const statutColor = (statut) => {
  if (!statut || statut === "programmé") return "informatique";
  if (statut === "actif") return "direction";
  if (statut === "cloture") return "receveur";
  return "receveur";
};

const peutReactiver = (voyage) =>
  voyage.statut === "cloture" && voyage.type === "non programmé";

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS RÉUTILISABLES
// ══════════════════════════════════════════════════════════════════════════════

function TypeSelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {TYPE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1, padding: "10px 8px", borderRadius: 8, cursor: "pointer",
              border: active ? `2px solid ${opt.border}` : "0.5px solid #ddd",
              background: active ? opt.bgLight : "transparent",
              color: active ? opt.text : "var(--color-text-primary)",
              fontWeight: 500, fontSize: 13, textAlign: "center",
              transition: "all 0.15s",
            }}
          >
            <div>{opt.label}</div>
            <div style={{ fontSize: 11, marginTop: 3, opacity: 0.8 }}>{opt.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  if (totalPages <= 9) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 5) pages.push("...");
    for (let i = Math.max(2, currentPage - 3); i <= Math.min(totalPages - 1, currentPage + 3); i++) pages.push(i);
    if (currentPage < totalPages - 4) pages.push("...");
    pages.push(totalPages);
  }

  const btnBase = {
    borderRadius: 4, border: "1px solid var(--color-border-tertiary)",
    cursor: "pointer", fontSize: 13, fontWeight: 500,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, flexWrap: "wrap" }}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{ ...btnBase, padding: "8px 12px", background: currentPage === 1 ? "var(--color-background-secondary)" : "var(--color-background-primary)", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
      >
        ← Précédent
      </button>

      {pages.map((page, idx) =>
        page === "..." ? (
          <span key={`dots-${idx}`} style={{ padding: "0 4px", color: "var(--color-text-secondary)" }}>...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={page === currentPage}
            style={{
              ...btnBase, width: 36, height: 36,
              border: page === currentPage ? "2px solid #1a73e8" : "1px solid var(--color-border-tertiary)",
              background: page === currentPage ? "#e8f0fe" : "var(--color-background-primary)",
              color: page === currentPage ? "#1a73e8" : "var(--color-text-primary)",
              cursor: page === currentPage ? "default" : "pointer",
              fontWeight: page === currentPage ? 600 : 500,
            }}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{ ...btnBase, padding: "8px 12px", background: currentPage === totalPages ? "var(--color-background-secondary)" : "var(--color-background-primary)", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
      >
        Suivant →
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SEGMENTS D'UN VOYAGE (accordéon)
// ══════════════════════════════════════════════════════════════════════════════

function SegmentsVoyage({ idVoyage }) {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/segments_voyage/${idVoyage}`)
      .then((r) => setSegments(r.data.segments || []))
      .catch(() => setSegments([]))
      .finally(() => setLoading(false));
  }, [idVoyage]);

  if (loading) return <div className="receveur-empty">Chargement...</div>;
  if (!segments.length) return <div className="receveur-empty">Aucun segment enregistré pour ce voyage</div>;

  return (
    <div className="segments-list">
      {segments.map((s) => (
        <div key={s.id_segment} className="segment-item">
          <span className="segment-ordre">{s.ordre}</span>
          <span className="segment-trajet">{s.point_depart} → {s.point_arrivee}</span>
          <span className={`badge-role ${statutColor(s.statut)}`}>{s.statut}</span>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LIGNE DE VOYAGE (tableau)
// ══════════════════════════════════════════════════════════════════════════════

function VoyageRow({ voyage, lignesMap, onEdit, onDelete, onReactiver }) {
  const [expanded, setExpanded] = useState(false);
  const [loadingRea, setLoadingRea] = useState(false);
  const isCloture = voyage.statut === "cloture";

  const handleReactiver = async (e) => {
    e.stopPropagation();
    setLoadingRea(true);
    await onReactiver(voyage);
    setLoadingRea(false);
  };

  return (
    <>
      <tr className="voyage-row">
        <td onClick={() => setExpanded(!expanded)}>
          <span className="badge-matricule">{voyage.id_voyage}</span>
        </td>
        <td onClick={() => setExpanded(!expanded)}>
          {lignesMap[voyage.id_ligne] || `Ligne ${voyage.id_ligne}`}
        </td>
        <td onClick={() => setExpanded(!expanded)}>{formatDate(voyage.date_heure)}</td>
        <td onClick={() => setExpanded(!expanded)}>{voyage.type || "—"}</td>
        <td onClick={() => setExpanded(!expanded)}>
          <span className={`badge-role ${statutColor(voyage.statut)}`}>
            {voyage.statut || "programmé"}
          </span>
        </td>
        <td onClick={() => setExpanded(!expanded)}>{voyage.montant_total ?? 0} DT</td>
        <td>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {!isCloture && (
              <button className="action-btn edit" onClick={(e) => { e.stopPropagation(); onEdit(voyage); }}>
                modifier
              </button>
            )}
            {peutReactiver(voyage) && (
              <button
                className="action-btn edit"
                disabled={loadingRea}
                style={{ background: "rgba(27,107,58,0.1)", color: "var(--green)", border: "1px solid rgba(27,107,58,0.3)" }}
                onClick={handleReactiver}
              >
                {loadingRea ? "..." : "🔄 Réactiver"}
              </button>
            )}
            <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); onDelete(voyage); }}>
              supprimer
            </button>
            <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => setExpanded(!expanded)}>
              {expanded ? "▲" : "▼"}
            </span>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="segments-row">
            <SegmentsVoyage idVoyage={voyage.id_voyage} />
          </td>
        </tr>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════════════════════════════════════════

function ModalWrapper({ icon, title, onClose, children, footer }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-icon">{icon}</div>
        <div className="modal-title">{title}</div>
        <div className="modal-form" style={{ overflowY: "auto", flex: 1, paddingRight: 4 }}>
          {children}
        </div>
        <div className="modal-actions">
          <button className="btn btn-gray" onClick={onClose}>Annuler</button>
          {footer}
        </div>
      </div>
    </div>
  );
}

// ── voyagesReceveur = voyages du receveur courant uniquement (passé depuis ReceveurCard)
function ModalAjouterVoyage({ matricule, appareil, onClose, onSuccess, voyagesReceveur }) {
  const [lignes, setLignes] = useState([]);
  const [segments, setSegments] = useState([]);
  const [form, setForm] = useState({ id_ligne: "", date_heure: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`${API}/lignes`).then((r) => setLignes(r.data.lignes || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.id_ligne) { setSegments([]); return; }
    axios.get(`${API}/segments_ligne/${form.id_ligne}`)
      .then((r) => setSegments(r.data.segments || []))
      .catch(() => setSegments([]));
  }, [form.id_ligne]);

  const handleSubmit = async () => {
    setError("");
    if (!form.type) return setError("Veuillez choisir le type de voyage.");
    if (!form.id_ligne) return setError("Veuillez choisir une ligne.");
    if (!form.date_heure) return setError("Veuillez choisir une date et heure.");
    if (new Date(form.date_heure) <= new Date()) return setError("La date doit être dans le futur.");
    if (!appareil) return setError("Aucun appareil actif pour ce receveur.");

    // ✅ Vérifie doublon uniquement sur les voyages de CE receveur
    if (voyagesReceveur.find((v) => v.id_ligne === parseInt(form.id_ligne) && v.statut !== "cloture"))
      return setError("Vous avez déjà un voyage actif sur cette ligne.");

    setLoading(true);
    try {
      const res = await axios.post(`${API}/ajouter_voyage`, {
        id_ligne: form.id_ligne, id_appareil: appareil,
        matricule_agent: matricule, type: form.type, date_heure: form.date_heure,
      });
      if (res.data.success) { onSuccess(); onClose(); }
      else setError(res.data.message || "Erreur lors de l'ajout.");
    } catch { setError("Erreur de connexion au serveur."); }
    setLoading(false);
  };

  const minDateStr = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <ModalWrapper
      icon="🚌" title="Ajouter un voyage" onClose={onClose}
      footer={
        <button className="btn" onClick={handleSubmit} disabled={loading || !appareil}>
          {loading ? "Ajout..." : "✓ Ajouter"}
        </button>
      }
    >
      <div className="modal-message">
        Receveur : <strong>{matricule}</strong>
        {appareil ? <> — Appareil : <strong>N° {appareil}</strong></> : <span className="text-error"> — Aucun appareil actif</span>}
      </div>
      {error && <div className="alert alert-error">⚠ {error}</div>}
      <div className="form-group">
        <label className="form-label">Type de voyage *</label>
        <TypeSelector value={form.type} onChange={(v) => setForm({ ...form, type: v })} />
      </div>
      <div className="form-group">
        <label className="form-label">Ligne</label>
        <select className="form-input" value={form.id_ligne} onChange={(e) => setForm({ ...form, id_ligne: e.target.value })}>
          <option value="">-- Choisir une ligne --</option>
          {lignes.map((l) => <option key={l.id_ligne} value={l.id_ligne}>{l.nom_ligne}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Date et heure du voyage</label>
        <input type="datetime-local" className="form-input" value={form.date_heure} min={minDateStr}
          onChange={(e) => setForm({ ...form, date_heure: e.target.value })} />
      </div>
      {segments.length > 0 && (
        <div className="form-group">
          <label className="form-label">Segments ({segments.length})</label>
          <div className="segments-list">
            {segments.map((s) => (
              <div key={s.ordre} className="segment-item">
                <span className="segment-ordre">{s.ordre}</span>
                <span className="segment-trajet">{s.point_depart} → {s.point_arrivee}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}

function ModalModifierVoyage({ voyage, onClose, onSuccess }) {
  const [lignes, setLignes] = useState([]);
  const [form, setForm] = useState({
    id_ligne: String(voyage.id_ligne),
    date_heure: voyage.date_heure ? new Date(voyage.date_heure).toISOString().slice(0, 16) : "",
    type: voyage.type || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`${API}/lignes`).then((r) => setLignes(r.data.lignes || [])).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (!form.type) return setError("Veuillez choisir le type.");
    if (!form.id_ligne) return setError("Veuillez choisir une ligne.");
    if (!form.date_heure) return setError("Veuillez choisir une date et heure.");
    setLoading(true);
    try {
      const res = await axios.put(`${API}/modifier_voyage/${voyage.id_voyage}`, form);
      if (res.data.success) { onSuccess(); onClose(); }
      else setError(res.data.message || "Erreur modification.");
    } catch { setError("Erreur de connexion."); }
    setLoading(false);
  };

  return (
    <ModalWrapper
      icon="✏️" title={`Modifier le voyage #${voyage.id_voyage}`} onClose={onClose}
      footer={
        <button className="btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "Enregistrement..." : "✓ Enregistrer"}
        </button>
      }
    >
      {error && <div className="alert alert-error">⚠ {error}</div>}
      <div className="form-group">
        <label className="form-label">Type de voyage *</label>
        <TypeSelector value={form.type} onChange={(v) => setForm({ ...form, type: v })} />
      </div>
      <div className="form-group">
        <label className="form-label">Ligne</label>
        <select className="form-input" value={form.id_ligne} onChange={(e) => setForm({ ...form, id_ligne: e.target.value })}>
          <option value="">-- Choisir une ligne --</option>
          {lignes.map((l) => <option key={l.id_ligne} value={l.id_ligne}>{l.nom_ligne}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Date et heure</label>
        <input type="datetime-local" className="form-input" value={form.date_heure}
          onChange={(e) => setForm({ ...form, date_heure: e.target.value })} />
      </div>
    </ModalWrapper>
  );
}

function ModalSupprimerVoyage({ voyage, lignesMap, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await axios.delete(`${API}/supprimer_voyage/${voyage.id_voyage}`);
      if (res.data.success) { onSuccess(); onClose(); }
      else setError(res.data.message || "Erreur suppression.");
    } catch { setError("Erreur de connexion."); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-icon">🗑️</div>
        <div className="modal-title">Supprimer le voyage</div>
        <div className="modal-message">
          Confirmer la suppression du voyage <strong>#{voyage.id_voyage}</strong> —{" "}
          <strong>{lignesMap[voyage.id_ligne] || `Ligne ${voyage.id_ligne}`}</strong> ?
          <br />
          <span style={{ color: "#e53935", fontSize: 13 }}>Cette action est irréversible.</span>
        </div>
        {error && <div className="alert alert-error">⚠ {error}</div>}
        <div className="modal-actions">
          <button className="btn btn-gray" onClick={onClose}>Annuler</button>
          <button className="btn" style={{ background: "#e53935", borderColor: "#e53935" }} onClick={handleDelete} disabled={loading}>
            {loading ? "Suppression..." : "🗑 Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CARTE RECEVEUR
// ══════════════════════════════════════════════════════════════════════════════

function ReceveurCard({ receveur, lignesMap, onVoyageAdded, onNotify }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("tous");
  const [showAjouter, setShowAjouter] = useState(false);
  const [voyageToEdit, setVoyageToEdit] = useState(null);
  const [voyageToDelete, setVoyageToDelete] = useState(null);

  const voyages = receveur.voyages || [];
  const appareil = receveur.appareil || null;
  const nbActifs = voyages.filter((v) => v.statut !== "cloture").length;
  const nbCloture = voyages.filter((v) => v.statut === "cloture").length;

  const voyagesFiltres = voyages.filter((v) => {
    if (activeTab === "actifs") return v.statut !== "cloture";
    if (activeTab === "cloture") return v.statut === "cloture";
    return true;
  });

  const tabStyle = (tab) => ({
    padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
    fontSize: "0.82rem", fontWeight: 600, fontFamily: "inherit",
    background: activeTab === tab ? "var(--navy)" : "var(--gray-100)",
    color: activeTab === tab ? "#fff" : "var(--gray-600)",
    transition: "all 0.15s",
  });

  const handleReactiver = async (voyage) => {
    try {
      const res = await axios.put(`${API}/reactiver_voyage/${voyage.id_voyage}`);
      if (res.data.success) {
        onNotify({ text: `Voyage #${voyage.id_voyage} réactivé avec succès !`, type: "success" });
        onVoyageAdded();
      } else {
        onNotify({ text: res.data.message || "Erreur réactivation.", type: "error" });
      }
    } catch (err) {
      onNotify({ text: err.response?.data?.message || "Erreur de connexion au serveur.", type: "error" });
    }
  };

  return (
    <div className="receveur-card">
      {showAjouter && (
        <ModalAjouterVoyage
          matricule={receveur.matricule_agent}
          appareil={appareil}
          voyagesReceveur={voyages}
          onClose={() => setShowAjouter(false)}
          onSuccess={onVoyageAdded}
        />
      )}
      {voyageToEdit && (
        <ModalModifierVoyage
          voyage={voyageToEdit}
          onClose={() => setVoyageToEdit(null)}
          onSuccess={onVoyageAdded}
        />
      )}
      {voyageToDelete && (
        <ModalSupprimerVoyage
          voyage={voyageToDelete}
          lignesMap={lignesMap}
          onClose={() => setVoyageToDelete(null)}
          onSuccess={onVoyageAdded}
        />
      )}

      {/* Header cliquable */}
      <div className={`receveur-header ${expanded ? "expanded" : ""}`} onClick={() => setExpanded(!expanded)}>
        <div className="receveur-avatar">{receveur.prenom?.[0]?.toUpperCase()}</div>
        <div className="receveur-info">
          <div className="receveur-nom">{receveur.prenom} {receveur.nom}</div>
          <div className="receveur-matricule">Matricule : {receveur.matricule_agent}</div>
        </div>
        <div className="receveur-badges">
          <span className="badge-matricule">{voyages.length} voyage(s)</span>
          {nbActifs > 0 && <span className="badge-role direction">🟡 {nbActifs} actif(s)</span>}
          {nbCloture > 0 && <span className="badge-role receveur">⬛ {nbCloture} clôturé(s)</span>}
          {appareil && <span className="badge-role informatique">📱 N° {appareil}</span>}
        </div>
        <div className={`receveur-arrow ${expanded ? "open" : ""}`}>▼</div>
      </div>

      {/* Corps déplié */}
      {expanded && (
        <div className="receveur-body">
          {/* Onglets */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, marginTop: 8 }}>
            <button style={tabStyle("tous")} onClick={() => setActiveTab("tous")}>Tous ({voyages.length})</button>
            <button style={tabStyle("actifs")} onClick={() => setActiveTab("actifs")}>🟡 Actifs ({nbActifs})</button>
            <button style={tabStyle("cloture")} onClick={() => setActiveTab("cloture")}>⬛ Clôturés ({nbCloture})</button>
          </div>

          {/* Tableau */}
          {voyagesFiltres.length === 0 ? (
            <div className="receveur-empty">Aucun voyage dans cet onglet</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Ligne</th><th>Date / Heure</th>
                  <th>Type</th><th>Statut</th><th>Montant</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {voyagesFiltres.map((v) => (
                  <VoyageRow
                    key={v.id_voyage}
                    voyage={v}
                    lignesMap={lignesMap}
                    onEdit={setVoyageToEdit}
                    onDelete={setVoyageToDelete}
                    onReactiver={handleReactiver}
                  />
                ))}
              </tbody>
            </table>
          )}

          {/* Bouton ajouter */}
          <div style={{ marginTop: 12, display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
            <button
              className="btn"
              disabled={!appareil}
              title={!appareil ? "Ce receveur n'a pas d'appareil actif" : ""}
              style={{ opacity: !appareil ? 0.45 : 1, cursor: !appareil ? "not-allowed" : "pointer" }}
              onClick={(e) => { e.stopPropagation(); if (appareil) setShowAjouter(true); }}
            >
              ➕ Ajouter un voyage
            </button>
            {!appareil && (
              <span style={{ fontSize: "0.78rem", color: "var(--red)", fontWeight: 500 }}>
                ⚠ Aucun appareil actif — attribution requise
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════════════════════

export default function ListeVoyages() {
  const navigate = useNavigate();
  const [receveurs, setReceveurs] = useState([]);
  const [lignesMap, setLignesMap] = useState({});
  const [search, setSearch] = useState("");
  const [filterLigne, setFilterLigne] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });

  const fetchData = useCallback(async () => {
    try {
      const [voyRes, appRes] = await Promise.all([
        axios.get(`${API}/voyages_receveurs`),
        axios.get(`${API}/appareils`),
      ]);
      if (!voyRes.data.success) return;

      const appareils = appRes.data.appareils || [];
      const grouped = {};

      voyRes.data.data.forEach((row) => {
        const key = row.matricule_agent;
        if (!grouped[key]) {
          const app = appareils.find(
            (a) => String(a.matricule_agent) === String(key) && a.statut === "actif"
          );
          grouped[key] = {
            matricule_agent: key,
            nom: row.nom,
            prenom: row.prenom,
            appareil: app ? app.num_serie : null,
            voyages: [],
          };
        }
        if (row.id_voyage) {
          grouped[key].voyages.push({
            id_voyage: row.id_voyage,
            id_ligne: row.id_ligne,
            date_heure: row.date_heure,
            date_cloture: row.date_cloture || null,
            statut: row.statut || "programmé",
            montant_total: row.montant_total ?? 0,
            type: row.type,
          });
        }
      });

      setReceveurs(Object.values(grouped));
    } catch {
      setMessage({ text: "Erreur de connexion au serveur.", type: "error" });
    }
  }, []);

  useEffect(() => {
    fetchData();
    axios.get(`${API}/lignes`).then((r) => {
      const map = {};
      (r.data.lignes || []).forEach((l) => { map[l.id_ligne] = l.nom_ligne; });
      setLignesMap(map);
    }).catch(() => {});
  }, [fetchData]);

  const handleVoyageAdded = useCallback(() => {
    fetchData();
    setMessage({ text: "Opération effectuée avec succès !", type: "success" });
  }, [fetchData]);

  const filtered = receveurs.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = String(r.matricule_agent).includes(search) ||
      (r.nom || "").toLowerCase().includes(q) ||
      (r.prenom || "").toLowerCase().includes(q);
    const matchLigne = !filterLigne || r.voyages.some((v) => String(v.id_ligne) === filterLigne);
    const matchDate = !filterDate || r.voyages.some((v) => v.date_heure?.startsWith(filterDate));
    return matchSearch && matchLigne && matchDate;
  });

  return (
    <div>
      <Notification message={message} onDone={() => setMessage({ text: "", type: "" })} />

      <div className="breadcrumb">
        SRTB › Direction › <span>Voyages receveurs</span>
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">Voyages par receveur</div>
          <div className="page-subtitle">{receveurs.length} receveur(s) enregistré(s)</div>
        </div>
        <button className="btn" onClick={() => navigate("/historique-voyages")}>
          📋 Historique des voyages
        </button>
      </div>

      <div className="filters-bar">
        <input
          className="search-input"
          placeholder="Rechercher par matricule, nom ou prénom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="form-input" value={filterLigne} onChange={(e) => setFilterLigne(e.target.value)}>
          <option value="">Toutes les lignes</option>
          {Object.entries(lignesMap).map(([id, nom]) => (
            <option key={id} value={id}>{nom}</option>
          ))}
        </select>
        <input type="date" className="form-input" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <p className="text-center">Aucun receveur trouvé</p>
        </div>
      ) : (
        filtered.map((r) => (
          <ReceveurCard
            key={r.matricule_agent}
            receveur={r}
            lignesMap={lignesMap}
            onNotify={setMessage}
            onVoyageAdded={handleVoyageAdded}
          />
        ))
      )}
    </div>
  );
}