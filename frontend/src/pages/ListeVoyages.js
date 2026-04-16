import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/global.css";
import Notification from "../components/Notification";

const API = "http://localhost:5000/api";
const ITEMS_PER_PAGE = 10;

const formatDate = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statutColor = (statut) => {
  if (!statut || statut === "programmé") return "informatique";
  if (statut === "actif") return "direction";
  if (statut === "cloture") return "receveur";
  return "receveur";
};

// Bouton Réactiver uniquement pour les voyages "non programmé" + "cloture"
const peutReactiver = (voyage) =>
  voyage.statut === "cloture" && voyage.type === "non programmé";

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
// TYPE SELECTOR
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
              flex: 1,
              padding: "10px 8px",
              borderRadius: 8,
              cursor: "pointer",
              border: active ? `2px solid ${opt.border}` : "0.5px solid #ddd",
              background: active ? opt.bgLight : "transparent",
              color: active ? opt.text : "var(--color-text-primary)",
              fontWeight: 500,
              fontSize: 13,
              textAlign: "center",
              transition: "all 0.15s",
            }}
          >
            <div>{opt.label}</div>
            <div style={{ fontSize: 11, marginTop: 3, opacity: 0.8 }}>
              {opt.desc}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SEGMENTS VOYAGE
// ══════════════════════════════════════════════════════════════════════════════

function SegmentsVoyage({ idVoyage }) {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API}/segments_voyage/${idVoyage}`)
      .then((r) => setSegments(r.data.segments || []))
      .catch(() => setSegments([]))
      .finally(() => setLoading(false));
  }, [idVoyage]);

  if (loading) return <div className="receveur-empty">Chargement...</div>;
  if (!segments.length)
    return (
      <div className="receveur-empty">
        Aucun segment enregistré pour ce voyage
      </div>
    );

  return (
    <div className="segments-list">
      {segments.map((s) => (
        <div key={s.id_segment} className="segment-item">
          <span className="segment-ordre">{s.ordre}</span>
          <span className="segment-trajet">
            {s.point_depart} → {s.point_arrivee}
          </span>
          <span className={`badge-role ${statutColor(s.statut)}`}>
            {s.statut}
          </span>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VOYAGE ROW
// ══════════════════════════════════════════════════════════════════════════════

function VoyageRow({ voyage, lignesMap, onEdit, onDelete, onReactiver }) {
  const [expanded, setExpanded] = useState(false);
  const [loadingRea, setLoadingRea] = useState(false);
  const isCloture = voyage.statut === "cloture";
  const canReactiver = peutReactiver(voyage);

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
        <td onClick={() => setExpanded(!expanded)}>
          {formatDate(voyage.date_heure)}
        </td>
        <td onClick={() => setExpanded(!expanded)}>{voyage.type || "—"}</td>
        <td onClick={() => setExpanded(!expanded)}>
          <span className={`badge-role ${statutColor(voyage.statut)}`}>
            {voyage.statut || "programmé"}
          </span>
        </td>
        <td onClick={() => setExpanded(!expanded)}>
          {voyage.montant_total ?? 0} DT
        </td>
        <td>
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {!isCloture && (
              <button
                className="action-btn edit"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(voyage);
                }}
              >
                modifier
              </button>
            )}
            {canReactiver && (
              <button
                className="action-btn edit"
                disabled={loadingRea}
                style={{
                  background: "rgba(27,107,58,0.1)",
                  color: "var(--green)",
                  border: "1px solid rgba(27,107,58,0.3)",
                }}
                onClick={handleReactiver}
              >
                {loadingRea ? "..." : "🔄 Réactiver"}
              </button>
            )}
            <button
              className="action-btn delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(voyage);
              }}
            >
              supprimer
            </button>
            <span
              style={{ cursor: "pointer", userSelect: "none" }}
              onClick={() => setExpanded(!expanded)}
            >
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
// MODAL AJOUTER VOYAGE
// ══════════════════════════════════════════════════════════════════════════════

function ModalAjouterVoyage({
  matricule,
  appareil,
  onClose,
  onSuccess,
  voyages,
}) {
  const [lignes, setLignes] = useState([]);
  const [segments, setSegments] = useState([]);
  const [form, setForm] = useState({ id_ligne: "", date_heure: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/lignes`)
      .then((r) => setLignes(r.data.lignes || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.id_ligne) {
      setSegments([]);
      return;
    }
    axios
      .get(`${API}/segments_ligne/${form.id_ligne}`)
      .then((r) => setSegments(r.data.segments || []))
      .catch(() => setSegments([]));
  }, [form.id_ligne]);

  const handleSubmit = async () => {
    setError("");
    if (!form.type) return setError("Veuillez choisir le type de voyage.");
    if (!form.id_ligne) return setError("Veuillez choisir une ligne.");
    if (!form.date_heure)
      return setError("Veuillez choisir une date et heure.");
    if (new Date(form.date_heure) <= new Date())
      return setError("La date doit être dans le futur.");
    if (!appareil) return setError("Aucun appareil actif pour ce receveur.");

    const doublon = voyages.find(
      (v) => v.id_ligne === parseInt(form.id_ligne) && v.statut !== "cloture",
    );
    if (doublon)
      return setError("Un voyage actif existe déjà pour cette ligne.");

    setLoading(true);
    try {
      const res = await axios.post(`${API}/ajouter_voyage`, {
        id_ligne: form.id_ligne,
        id_appareil: appareil,
        matricule_agent: matricule,
        type: form.type,
        date_heure: form.date_heure,
      });
      if (res.data.success) {
        onSuccess();
        onClose();
      } else setError(res.data.message || "Erreur lors de l'ajout.");
    } catch {
      setError("Erreur de connexion au serveur.");
    }
    setLoading(false);
  };

  const minDateStr = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div className="modal-overlay">
      <div
        className="modal-box"
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-icon">🚌</div>
        <div className="modal-title">Ajouter un voyage</div>
        <div className="modal-message">
          Receveur : <strong>{matricule}</strong>
          {appareil ? (
            <>
              {" "}
              — Appareil : <strong>N° {appareil}</strong>
            </>
          ) : (
            <span className="text-error"> — Aucun appareil actif</span>
          )}
        </div>
        {error && <div className="alert alert-error">⚠ {error}</div>}
        <div
          className="modal-form"
          style={{ overflowY: "auto", flex: 1, paddingRight: 4 }}
        >
          <div className="form-group">
            <label className="form-label">Type de voyage *</label>
            <TypeSelector
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Ligne</label>
            <select
              className="form-input"
              value={form.id_ligne}
              onChange={(e) => setForm({ ...form, id_ligne: e.target.value })}
            >
              <option value="">-- Choisir une ligne --</option>
              {lignes.map((l) => (
                <option key={l.id_ligne} value={l.id_ligne}>
                  {l.nom_ligne}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date et heure du voyage</label>
            <input
              type="datetime-local"
              className="form-input"
              value={form.date_heure}
              min={minDateStr}
              onChange={(e) => setForm({ ...form, date_heure: e.target.value })}
            />
          </div>
          {segments.length > 0 && (
            <div className="form-group">
              <label className="form-label">Segments ({segments.length})</label>
              <div className="segments-list">
                {segments.map((s) => (
                  <div key={s.ordre} className="segment-item">
                    <span className="segment-ordre">{s.ordre}</span>
                    <span className="segment-trajet">
                      {s.point_depart} → {s.point_arrivee}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-gray" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn"
            onClick={handleSubmit}
            disabled={loading || !appareil}
          >
            {loading ? "Ajout..." : "✓ Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL MODIFIER VOYAGE
// ══════════════════════════════════════════════════════════════════════════════

function ModalModifierVoyage({ voyage, onClose, onSuccess }) {
  const [lignes, setLignes] = useState([]);
  const [form, setForm] = useState({
    id_ligne: String(voyage.id_ligne),
    date_heure: voyage.date_heure
      ? new Date(voyage.date_heure).toISOString().slice(0, 16)
      : "",
    type: voyage.type || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/lignes`)
      .then((r) => setLignes(r.data.lignes || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (!form.type) return setError("Veuillez choisir le type.");
    if (!form.id_ligne) return setError("Veuillez choisir une ligne.");
    if (!form.date_heure)
      return setError("Veuillez choisir une date et heure.");
    setLoading(true);
    try {
      const res = await axios.put(
        `${API}/modifier_voyage/${voyage.id_voyage}`,
        {
          id_ligne: form.id_ligne,
          type: form.type,
          date_heure: form.date_heure,
        },
      );
      if (res.data.success) {
        onSuccess();
        onClose();
      } else setError(res.data.message || "Erreur modification.");
    } catch {
      setError("Erreur de connexion.");
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-box"
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-icon">✏️</div>
        <div className="modal-title">
          Modifier le voyage #{voyage.id_voyage}
        </div>
        {error && <div className="alert alert-error">⚠ {error}</div>}
        <div className="modal-form" style={{ overflowY: "auto", flex: 1 }}>
          <div className="form-group">
            <label className="form-label">Type de voyage *</label>
            <TypeSelector
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Ligne</label>
            <select
              className="form-input"
              value={form.id_ligne}
              onChange={(e) => setForm({ ...form, id_ligne: e.target.value })}
            >
              <option value="">-- Choisir une ligne --</option>
              {lignes.map((l) => (
                <option key={l.id_ligne} value={l.id_ligne}>
                  {l.nom_ligne}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date et heure</label>
            <input
              type="datetime-local"
              className="form-input"
              value={form.date_heure}
              onChange={(e) => setForm({ ...form, date_heure: e.target.value })}
            />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-gray" onClick={onClose}>
            Annuler
          </button>
          <button className="btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Enregistrement..." : "✓ Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL SUPPRIMER VOYAGE
// ══════════════════════════════════════════════════════════════════════════════

function ModalSupprimerVoyage({ voyage, lignesMap, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await axios.delete(
        `${API}/supprimer_voyage/${voyage.id_voyage}`,
      );
      if (res.data.success) {
        onSuccess();
        onClose();
      } else setError(res.data.message || "Erreur suppression.");
    } catch {
      setError("Erreur de connexion.");
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-icon">🗑️</div>
        <div className="modal-title">Supprimer le voyage</div>
        <div className="modal-message">
          Confirmer la suppression du voyage{" "}
          <strong>#{voyage.id_voyage}</strong> —{" "}
          <strong>
            {lignesMap[voyage.id_ligne] || `Ligne ${voyage.id_ligne}`}
          </strong>{" "}
          ?
          <br />
          <span style={{ color: "#e53935", fontSize: 13 }}>
            Cette action est irréversible.
          </span>
        </div>
        {error && <div className="alert alert-error">⚠ {error}</div>}
        <div className="modal-actions">
          <button className="btn btn-gray" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn"
            style={{ background: "#e53935", borderColor: "#e53935" }}
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Suppression..." : "🗑 Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGINATION
// ══════════════════════════════════════════════════════════════════════════════

function Pagination({ currentPage, totalPages, onPageChange }) {
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 9) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 5) pages.push("...");
      const start = Math.max(2, currentPage - 3);
      const end = Math.min(totalPages - 1, currentPage + 3);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 4) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "16px",
        flexWrap: "wrap",
      }}
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          padding: "8px 12px",
          borderRadius: 4,
          border: "1px solid var(--color-border-tertiary)",
          background:
            currentPage === 1
              ? "var(--color-background-secondary)"
              : "var(--color-background-primary)",
          cursor: currentPage === 1 ? "not-allowed" : "pointer",
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        ← Précédent
      </button>
      {getPageNumbers().map((page, idx) =>
        page === "..." ? (
          <span
            key={`dots-${idx}`}
            style={{ padding: "0 4px", color: "var(--color-text-secondary)" }}
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={page === currentPage}
            style={{
              width: 36,
              height: 36,
              borderRadius: 4,
              border:
                page === currentPage
                  ? "2px solid #1a73e8"
                  : "1px solid var(--color-border-tertiary)",
              background:
                page === currentPage
                  ? "#e8f0fe"
                  : "var(--color-background-primary)",
              color:
                page === currentPage ? "#1a73e8" : "var(--color-text-primary)",
              cursor: page === currentPage ? "default" : "pointer",
              fontWeight: page === currentPage ? 600 : 500,
              fontSize: 13,
            }}
          >
            {page}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          padding: "8px 12px",
          borderRadius: 4,
          border: "1px solid var(--color-border-tertiary)",
          background:
            currentPage === totalPages
              ? "var(--color-background-secondary)"
              : "var(--color-background-primary)",
          cursor: currentPage === totalPages ? "not-allowed" : "pointer",
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        Suivant →
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL HISTORIQUE VOYAGES
// ══════════════════════════════════════════════════════════════════════════════

function ModalHistoriqueVoyages({ onClose, lignesMap }) {
  const [allVoyages, setAllVoyages] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("tous");
  const [statutFilter, setStatutFilter] = useState("tous");
  const [ligneFilter, setLigneFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [receveurFilter, setReceveurFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchAllVoyages();
  }, []); // eslint-disable-line

  const fetchAllVoyages = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/voyages_receveurs`);
      if (res.data.success) {
        const voyages = [];
        res.data.data.forEach((row) => {
          if (row.id_voyage) {
            voyages.push({
              id_voyage: row.id_voyage,
              id_ligne: row.id_ligne,
              date_heure: row.date_heure,
              statut: row.statut || "programmé",
              type: row.type || "programmé",
              matricule: row.matricule_agent,
              nom_receveur: `${row.prenom} ${row.nom}`,
              montant_total: row.montant_total ?? 0,
            });
          }
        });
        setAllVoyages(voyages);
        applyFilters(voyages, "tous", "tous", "", "", "");
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const applyFilters = (voyages, type, statut, ligne, date, receveur) => {
    const filtered = voyages.filter((v) => {
      const matchType = type === "tous" || v.type === type;
      const matchStatut = statut === "tous" || v.statut === statut;
      const matchLigne = !ligne || String(v.id_ligne) === ligne;
      const matchDate =
        !date || (v.date_heure && v.date_heure.startsWith(date));
      const matchReceveur =
        !receveur ||
        v.nom_receveur.toLowerCase().includes(receveur.toLowerCase());
      return (
        matchType && matchStatut && matchLigne && matchDate && matchReceveur
      );
    });
    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const handleTypeFilter = (val) => {
    setTypeFilter(val);
    applyFilters(
      allVoyages,
      val,
      statutFilter,
      ligneFilter,
      dateFilter,
      receveurFilter,
    );
  };
  const handleStatutFilter = (val) => {
    setStatutFilter(val);
    applyFilters(
      allVoyages,
      typeFilter,
      val,
      ligneFilter,
      dateFilter,
      receveurFilter,
    );
  };
  const handleLigneFilter = (val) => {
    setLigneFilter(val);
    applyFilters(
      allVoyages,
      typeFilter,
      statutFilter,
      val,
      dateFilter,
      receveurFilter,
    );
  };
  const handleDateFilter = (val) => {
    setDateFilter(val);
    applyFilters(
      allVoyages,
      typeFilter,
      statutFilter,
      ligneFilter,
      val,
      receveurFilter,
    );
  };
  const handleReceveurFilter = (val) => {
    setReceveurFilter(val);
    applyFilters(
      allVoyages,
      typeFilter,
      statutFilter,
      ligneFilter,
      dateFilter,
      val,
    );
  };

  const uniqueLignes = [...new Set(allVoyages.map((v) => v.id_ligne))];
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  return (
    <div className="modal-overlay">
      <div
        className="modal-box"
        style={{
          maxHeight: "95vh",
          maxWidth: "95vw",
          width: 1300,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="modal-icon">📋</div>
        <div className="modal-title">Historique des voyages</div>

        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-border-tertiary)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ flex: "0 1 160px" }}>
            <label
              style={{
                fontSize: 11,
                color: "var(--color-text-secondary)",
                display: "block",
                marginBottom: 4,
              }}
            >
              Type
            </label>
            <select
              className="form-input"
              value={typeFilter}
              onChange={(e) => handleTypeFilter(e.target.value)}
              style={{ fontSize: 13 }}
            >
              <option value="tous">Tous les types</option>
              <option value="programmé">Programmé</option>
              <option value="non programmé">Non programmé</option>
            </select>
          </div>
          <div style={{ flex: "0 1 160px" }}>
            <label
              style={{
                fontSize: 11,
                color: "var(--color-text-secondary)",
                display: "block",
                marginBottom: 4,
              }}
            >
              Statut
            </label>
            <select
              className="form-input"
              value={statutFilter}
              onChange={(e) => handleStatutFilter(e.target.value)}
              style={{ fontSize: 13 }}
            >
              <option value="tous">Tous les statuts</option>
              <option value="actif">Actif</option>
              <option value="cloture">Clôturé</option>
              <option value="programmé">Programmé</option>
            </select>
          </div>
          <div style={{ flex: "0 1 160px" }}>
            <label
              style={{
                fontSize: 11,
                color: "var(--color-text-secondary)",
                display: "block",
                marginBottom: 4,
              }}
            >
              Ligne
            </label>
            <select
              className="form-input"
              value={ligneFilter}
              onChange={(e) => handleLigneFilter(e.target.value)}
              style={{ fontSize: 13 }}
            >
              <option value="">Toutes les lignes</option>
              {uniqueLignes.map((id) => (
                <option key={id} value={id}>
                  {lignesMap[id] || `Ligne ${id}`}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: "0 1 140px" }}>
            <label
              style={{
                fontSize: 11,
                color: "var(--color-text-secondary)",
                display: "block",
                marginBottom: 4,
              }}
            >
              Date
            </label>
            <input
              type="date"
              className="form-input"
              value={dateFilter}
              onChange={(e) => handleDateFilter(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label
              style={{
                fontSize: 11,
                color: "var(--color-text-secondary)",
                display: "block",
                marginBottom: 4,
              }}
            >
              Receveur
            </label>
            <input
              className="search-input"
              placeholder="Rechercher..."
              value={receveurFilter}
              onChange={(e) => handleReceveurFilter(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "var(--color-text-secondary)",
              }}
            >
              Chargement...
            </div>
          ) : filteredData.length === 0 ? (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "var(--color-text-secondary)",
              }}
            >
              Aucun voyage ne correspond aux filtres
            </div>
          ) : (
            <table className="data-table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Receveur</th>
                  <th>Ligne</th>
                  <th>Date / Heure</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((v) => (
                  <tr key={v.id_voyage}>
                    <td>
                      <span className="badge-matricule">{v.id_voyage}</span>
                    </td>
                    <td>{v.nom_receveur}</td>
                    <td>{lignesMap[v.id_ligne] || `Ligne ${v.id_ligne}`}</td>
                    <td>{formatDate(v.date_heure)}</td>
                    <td style={{ fontSize: 12 }}>
                      {v.type === "non programmé"
                        ? "Non programmé"
                        : "Programmé"}
                    </td>
                    <td>
                      <span className={`badge-role ${statutColor(v.statut)}`}>
                        {v.statut}
                      </span>
                    </td>
                    <td>{v.montant_total} DT</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filteredData.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}

        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--color-border-tertiary)",
            fontSize: 12,
            color: "var(--color-text-secondary)",
          }}
        >
          {filteredData.length === 0
            ? "0 voyage(s)"
            : `${startIdx + 1}–${Math.min(startIdx + ITEMS_PER_PAGE, filteredData.length)} sur ${filteredData.length} total`}
        </div>

        <div className="modal-actions">
          <button className="btn btn-gray" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RECEVEUR CARD
// ══════════════════════════════════════════════════════════════════════════════

function ReceveurCard({
  receveur,
  lignesMap,
  onVoyageAdded,
  onNotify,
  tousLesVoyages,
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("tous");
  const [showModal, setShowModal] = useState(false);
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
    padding: "6px 14px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: 600,
    fontFamily: "inherit",
    background: activeTab === tab ? "var(--navy)" : "var(--gray-100)",
    color: activeTab === tab ? "#fff" : "var(--gray-600)",
    transition: "all 0.15s",
  });

  const handleReactiver = async (voyage) => {
    try {
      const res = await axios.put(
        `${API}/reactiver_voyage/${voyage.id_voyage}`,
      );
      if (res.data.success) {
        onNotify({
          text: `Voyage #${voyage.id_voyage} réactivé avec succès !`,
          type: "success",
        });
        onVoyageAdded();
      } else {
        onNotify({
          text: res.data.message || "Erreur réactivation.",
          type: "error",
        });
      }
    } catch {
      onNotify({ text: "Erreur de connexion au serveur.", type: "error" });
    }
  };

  return (
    <div className="receveur-card">
      {showModal && (
        <ModalAjouterVoyage
          matricule={receveur.matricule_agent}
          appareil={appareil}
          voyages={tousLesVoyages}
          onClose={() => setShowModal(false)}
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

      <div
        className={`receveur-header ${expanded ? "expanded" : ""}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="receveur-avatar">
          {receveur.prenom?.[0]?.toUpperCase()}
        </div>
        <div className="receveur-info">
          <div className="receveur-nom">
            {receveur.prenom} {receveur.nom}
          </div>
          <div className="receveur-matricule">
            Matricule : {receveur.matricule_agent}
          </div>
        </div>
        <div className="receveur-badges">
          <span className="badge-matricule">{voyages.length} voyage(s)</span>
          {nbActifs > 0 && (
            <span className="badge-role direction">🟡 {nbActifs} actif(s)</span>
          )}
          {nbCloture > 0 && (
            <span className="badge-role receveur">
              ⬛ {nbCloture} clôturé(s)
            </span>
          )}
          {appareil && (
            <span className="badge-role informatique">📱 N° {appareil}</span>
          )}
        </div>
        <div className={`receveur-arrow ${expanded ? "open" : ""}`}>▼</div>
      </div>

      {expanded && (
        <div className="receveur-body">
          <div
            style={{ display: "flex", gap: 8, marginBottom: 16, marginTop: 8 }}
          >
            <button
              style={tabStyle("tous")}
              onClick={() => setActiveTab("tous")}
            >
              Tous ({voyages.length})
            </button>
            <button
              style={tabStyle("actifs")}
              onClick={() => setActiveTab("actifs")}
            >
              🟡 Actifs ({nbActifs})
            </button>
            <button
              style={tabStyle("cloture")}
              onClick={() => setActiveTab("cloture")}
            >
              ⬛ Clôturés ({nbCloture})
            </button>
          </div>

          {voyagesFiltres.length === 0 ? (
            <div className="receveur-empty">Aucun voyage dans cet onglet</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ligne</th>
                  <th>Date / Heure</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Montant</th>
                  <th>Actions</th>
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

          <button
            className="btn"
            style={{ marginTop: 12 }}
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(true);
            }}
          >
            ➕ Ajouter un voyage
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════════════════════

export default function ListeVoyages() {
  const [receveurs, setReceveurs] = useState([]);
  const [lignesMap, setLignesMap] = useState({});
  const [search, setSearch] = useState("");
  const [filterLigne, setFilterLigne] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showHistorique, setShowHistorique] = useState(false);

  useEffect(() => {
    fetchData();
    axios
      .get(`${API}/lignes`)
      .then((r) => {
        const map = {};
        (r.data.lignes || []).forEach((l) => {
          map[l.id_ligne] = l.nom_ligne;
        });
        setLignesMap(map);
      })
      .catch(() => {});
  }, []); // eslint-disable-line

  const fetchData = async () => {
    try {
      const [voyRes, appRes] = await Promise.all([
        axios.get(`${API}/voyages_receveurs`),
        axios.get(`${API}/appareils`),
      ]);
      if (voyRes.data.success) {
        const appareils = appRes.data.appareils || [];
        const grouped = {};
        voyRes.data.data.forEach((row) => {
          const key = row.matricule_agent;
          if (!grouped[key]) {
            const app = appareils.find(
              (a) =>
                String(a.matricule_agent) === String(row.matricule_agent) &&
                a.statut === "actif",
            );
            grouped[key] = {
              matricule_agent: row.matricule_agent,
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
      }
    } catch {
      setMessage({ text: "Erreur de connexion au serveur.", type: "error" });
    }
  };

  const filtered = receveurs.filter((r) => {
    const matchSearch =
      String(r.matricule_agent).includes(search) ||
      (r.nom || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.prenom || "").toLowerCase().includes(search.toLowerCase());
    const matchLigne = filterLigne
      ? r.voyages.some((v) => String(v.id_ligne) === filterLigne)
      : true;
    const matchDate = filterDate
      ? r.voyages.some(
          (v) => v.date_heure && v.date_heure.startsWith(filterDate),
        )
      : true;
    return matchSearch && matchLigne && matchDate;
  });

  return (
    <div>
      <Notification
        message={message}
        onDone={() => setMessage({ text: "", type: "" })}
      />

      <div className="breadcrumb">
        SRTB › Direction › <span>Voyages receveurs</span>
      </div>
      <div className="page-header">
        <div>
          <div className="page-title">Voyages par receveur</div>
          <div className="page-subtitle">
            {receveurs.length} receveur(s) enregistré(s)
          </div>
        </div>
        <button className="btn" onClick={() => setShowHistorique(true)}>
          📋 Historique des voyages
        </button>
      </div>

      {showHistorique && (
        <ModalHistoriqueVoyages
          onClose={() => setShowHistorique(false)}
          lignesMap={lignesMap}
        />
      )}

      <div className="filters-bar">
        <input
          className="search-input"
          placeholder="Rechercher par matricule, nom ou prénom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-input"
          value={filterLigne}
          onChange={(e) => setFilterLigne(e.target.value)}
        >
          <option value="">Toutes les lignes</option>
          {Object.entries(lignesMap).map(([id, nom]) => (
            <option key={id} value={id}>
              {nom}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="form-input"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
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
            tousLesVoyages={receveurs.flatMap((rec) => rec.voyages)}
            onVoyageAdded={() => {
              fetchData();
              setMessage({
                text: "Opération effectuée avec succès !",
                type: "success",
              });
            }}
          />
        ))
      )}
    </div>
  );
}
