import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import "../styles/global.css";
import Notification from "../components/Notification";
import Pagination from "../components/Pagination";

const API = "http://localhost:5000/api";
const ITEMS_PER_PAGE = 15;

// ══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════════════════════════════════════

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");

const fmtDT = (ms) => {
  const val = Number(ms || 0);
  if (!isFinite(val) || isNaN(val)) return "— DT";
  return (val / 1000).toLocaleString("fr-FR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }) + " DT";
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

const fmtTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// ✅ Fix décalage UTC : ne passe pas par toISOString()
const formatDateForAPI = (dateStr) => String(dateStr).split("T")[0];

// ══════════════════════════════════════════════════════════════════════════════
// MODAL TRANSACTIONS
// ══════════════════════════════════════════════════════════════════════════════

function ModalTransactions({ journee, onClose }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/controleur/tickets`, {
        params: {
          matricule_agent: journee.matricule_agent,
          date: formatDateForAPI(journee.date),
        },
      })
      .then((r) => setTickets(r.data.tickets || []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [journee]);

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (t.type_tarif || "").toLowerCase().includes(q) ||
      (t.point_depart || "").toLowerCase().includes(q) ||
      (t.point_arrivee || "").toLowerCase().includes(q)
    );
  });

  const totalPayant = filtered.reduce(
    (s, t) => s + (Number(t.montant_total) || 0),
    0
  );
  const nbGratuits = filtered.filter((t) => Number(t.montant_total) === 0).length;

  const handleExport = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["#", "Heure", "Voyage", "Départ", "Arrivée", "Tarif", "Qté", "Total (ms)"],
      ...tickets.map((t, i) => [
        i + 1,
        fmtTime(t.date_heure),
        `#${t.id_voyage}`,
        t.point_depart || "—",
        t.point_arrivee || "—",
        t.type_tarif || "—",
        t.quantite || 0,
        t.montant_total || 0,
      ]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `transactions_${journee.matricule_agent}_${formatDateForAPI(journee.date)}.xlsx`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 860, width: "96vw", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              🧾 Transactions — {journee.prenom} {journee.nom}
            </h2>
            <div style={{ fontSize: "0.78rem", color: "var(--gray-400)", marginTop: 2 }}>
              {fmtDate(journee.date)} · {journee.nom_ligne || `Ligne #${journee.id_ligne}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn btn-gold" style={{ fontSize: "0.82rem", padding: "8px 16px" }} onClick={handleExport}>
              ⬇ Exporter
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* KPIs mini */}
        <div className="ctrl-modal-kpi">
          <div className="ctrl-modal-kpi-item">
            <div className="ctrl-modal-kpi-label">Transactions</div>
            <div className="ctrl-modal-kpi-value">{filtered.length}</div>
          </div>
          <div className="ctrl-modal-kpi-item">
            <div className="ctrl-modal-kpi-label">Recette</div>
            <div className="ctrl-modal-kpi-value green">{fmt(totalPayant)} ms</div>
          </div>
          <div className="ctrl-modal-kpi-item">
            <div className="ctrl-modal-kpi-label">Gratuits</div>
            <div className="ctrl-modal-kpi-value gold">{nbGratuits}</div>
          </div>
        </div>

        {/* Recherche */}
        <div style={{ padding: "12px 28px" }}>
          <input
            className="search-input"
            style={{ margin: 0 }}
            placeholder="Rechercher par tarif, départ, arrivée..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Tableau */}
        <div style={{ padding: "0 28px 20px", overflowX: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--gray-400)" }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--gray-400)" }}>Aucune transaction trouvée</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Heure</th>
                  <th>Voyage</th>
                  <th>Départ → Arrivée</th>
                  <th>Tarif</th>
                  <th>Qté</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const isGratuit = Number(t.montant_total) === 0;
                  return (
                    <tr key={t.id_ticket}>
                      <td style={{ color: "var(--gray-400)", fontSize: "0.75rem" }}>{i + 1}</td>
                      <td className="ctrl-td-time">{fmtTime(t.date_heure)}</td>
                      <td><span className="badge-matricule">#{t.id_voyage}</span></td>
                      <td style={{ fontSize: "0.87rem" }}>
                        <span style={{ color: "var(--navy)", fontWeight: 500 }}>{t.point_depart}</span>
                        <span style={{ color: "var(--gray-400)", margin: "0 6px" }}>→</span>
                        <span>{t.point_arrivee}</span>
                      </td>
                      <td>
                        <span className={isGratuit ? "badge-tarif-free" : "badge-tarif-paid"}>
                          {t.type_tarif}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>{t.quantite}</td>
                      <td>
                        {isGratuit
                          ? <span style={{ color: "var(--green)", fontWeight: 600, fontSize: "0.82rem" }}>Gratuit</span>
                          : <span className="montant-badge">{fmt(t.montant_total)} ms</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--navy)" }}>
                  <td colSpan={4} style={{ color: "var(--gold)", fontWeight: 700, fontSize: "0.78rem", padding: "10px 18px", letterSpacing: "1px", textTransform: "uppercase" }}>
                    Total
                  </td>
                  <td style={{ color: "#fff", fontWeight: 700, textAlign: "center", padding: "10px 18px" }}>
                    {filtered.reduce((s, t) => s + t.quantite, 0)}
                  </td>
                  <td style={{ padding: "10px 18px" }} />
                  <td style={{ padding: "10px 18px" }}>
                    <span style={{ background: "var(--gold)", color: "var(--navy-dark)", padding: "3px 12px", borderRadius: 20, fontWeight: 700, fontSize: "0.88rem" }}>
                      {fmt(totalPayant)} ms
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL RAPPORT DÉTAILLÉ
// ══════════════════════════════════════════════════════════════════════════════

function ModalRapportDetail({ journee, onClose }) {
  const [rapport, setRapport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API}/controleur/rapport_detail`, {
        params: {
          matricule_agent: journee.matricule_agent,
          date: formatDateForAPI(journee.date),
        },
      })
      .then((r) => setRapport(r.data))
      .catch(() => setRapport(null))
      .finally(() => setLoading(false));
  }, [journee]);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" style={{ maxWidth: 420 }}>
          <div style={{ textAlign: "center", padding: 40, color: "var(--gray-400)" }}>
            Chargement du rapport...
          </div>
        </div>
      </div>
    );
  }

  const r = rapport || {
    total_ms: journee.recette_ms || 0,
    nb_tickets: journee.nb_tickets || 0,
    nb_payants: journee.nb_payants || 0,
    nb_gratuits: journee.nb_gratuits || 0,
    tickets: [],
    par_tarif: [],
    par_voyage: [],
  };

  const tauxGrat = r.nb_tickets > 0
    ? (((r.nb_gratuits || 0) / r.nb_tickets) * 100).toFixed(1)
    : "0.0";
  const prixMoyen = r.nb_payants > 0
    ? Math.round(Number(r.total_ms) / r.nb_payants)
    : 0;

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([
      [`RAPPORT — ${fmtDate(journee.date)}`],
      [`Agent : ${journee.prenom} ${journee.nom}`],
      [],
      ["Indicateur", "Valeur"],
      ["Recette totale (ms)", Number(r.total_ms)],
      ["Recette totale (DT)", fmtDT(r.total_ms)],
      ["Total tickets", r.nb_tickets],
      ["Payants", r.nb_payants],
      ["Gratuits", r.nb_gratuits],
      ["Prix moyen (ms)", prixMoyen],
      ["Taux gratuité (%)", tauxGrat],
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, "Résumé");
    if (r.par_tarif?.length > 0) {
      const ws2 = XLSX.utils.aoa_to_sheet([
        ["Type", "Quantité", "Total (ms)"],
        ...r.par_tarif.map((t) => [t.type_tarif, t.quantite, t.total]),
      ]);
      XLSX.utils.book_append_sheet(wb, ws2, "Par tarif");
    }
    if (r.par_voyage?.length > 0) {
      const ws3 = XLSX.utils.aoa_to_sheet([
        ["Voyage", "Type", "Ligne", "Tickets", "Recette (ms)"],
        ...r.par_voyage.map((v) => [`#${v.id_voyage}`, v.type, v.nom_ligne, v.nb_tickets, v.total]),
      ]);
      XLSX.utils.book_append_sheet(wb, ws3, "Par voyage");
    }
    XLSX.writeFile(wb, `rapport_${journee.matricule_agent}_${formatDateForAPI(journee.date)}.xlsx`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 860, width: "96vw", maxHeight: "92vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              📊 Rapport journée — {journee.prenom} {journee.nom}
            </h2>
            <div style={{ fontSize: "0.78rem", color: "var(--gray-400)", marginTop: 2 }}>
              {fmtDate(journee.date)} · Matricule {journee.matricule_agent}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn btn-gold" style={{ fontSize: "0.82rem", padding: "8px 16px" }} onClick={handleExport}>
              ⬇ Exporter Excel
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={{ padding: "20px 28px" }}>

          {/* KPI résumé */}
          <div className="form-section-title" style={{ marginBottom: 14 }}>Résumé de la journée</div>
          <div className="ctrl-rapport-kpi-grid">
            <div className="ctrl-rapport-kpi-item green">
              <div className="ctrl-rk-icon">💰</div>
              <div className="ctrl-rk-label">Recette totale</div>
              <div className="ctrl-rk-value">{fmtDT(r.total_ms)}</div>
              <div className="ctrl-rk-sub">{fmt(r.total_ms)} ms</div>
            </div>
            <div className="ctrl-rapport-kpi-item navy">
              <div className="ctrl-rk-icon">🎟️</div>
              <div className="ctrl-rk-label">Tickets vendus</div>
              <div className="ctrl-rk-value">{r.nb_tickets}</div>
              <div className="ctrl-rk-sub">{r.nb_payants} payants · {r.nb_gratuits} gratuits</div>
            </div>
            <div className="ctrl-rapport-kpi-item gold">
              <div className="ctrl-rk-icon">📉</div>
              <div className="ctrl-rk-label">Taux de gratuité</div>
              <div className="ctrl-rk-value">{tauxGrat}%</div>
              <div className="ctrl-rk-sub">Prix moyen : {fmt(prixMoyen)} ms</div>
            </div>
          </div>

          {/* Par tarif */}
          {r.par_tarif?.length > 0 && (
            <>
              <div className="form-section-title" style={{ marginBottom: 12 }}>Répartition par type de tarif</div>
              <table className="data-table" style={{ marginBottom: 24 }}>
                <thead>
                  <tr>
                    <th>Type de tarif</th>
                    <th>Quantité</th>
                    <th>Total (ms)</th>
                    <th>Total (DT)</th>
                    <th>% du total</th>
                  </tr>
                </thead>
                <tbody>
                  {r.par_tarif.map((t) => {
                    const pct = Number(r.total_ms) > 0
                      ? ((Number(t.total) / Number(r.total_ms)) * 100).toFixed(1)
                      : "0.0";
                    return (
                      <tr key={t.type_tarif}>
                        <td>
                          <span className={Number(t.total) === 0 ? "badge-tarif-free" : "badge-tarif-paid"}>
                            {t.type_tarif}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>{t.quantite}</td>
                        <td><span className="montant-badge">{fmt(t.total)} ms</span></td>
                        <td style={{ color: "var(--green)", fontWeight: 600 }}>{fmtDT(t.total)}</td>
                        <td>
                          <div className="ctrl-progress-bar">
                            <div className="ctrl-progress-track">
                              <div className="ctrl-progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="ctrl-progress-pct">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          {/* Par voyage */}
          {r.par_voyage?.length > 0 && (
            <>
              <div className="form-section-title" style={{ marginBottom: 12 }}>Répartition par voyage</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Voyage</th>
                    <th>Type</th>
                    <th>Ligne</th>
                    <th>Tickets</th>
                    <th>Gratuits</th>
                    <th>Payants</th>
                    <th>Recette</th>
                  </tr>
                </thead>
                <tbody>
                  {r.par_voyage.map((v) => (
                    <tr key={v.id_voyage}>
                      <td><span className="badge-matricule">#{v.id_voyage}</span></td>
                      <td>
                        <span className={`badge-role ${v.type === "programmé" ? "informatique" : "direction"}`}>
                          {v.type}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.87rem" }}>{v.nom_ligne || `Ligne ${v.id_ligne}`}</td>
                      <td style={{ textAlign: "center" }}>{v.nb_tickets}</td>
                      <td style={{ textAlign: "center", color: "var(--green)", fontWeight: 600 }}>{v.nb_gratuits}</td>
                      <td style={{ textAlign: "center" }}>{v.nb_payants}</td>
                      <td>
                        {Number(v.total) > 0
                          ? <span className="montant-badge">{fmt(v.total)} ms</span>
                          : <span style={{ color: "var(--gray-400)", fontSize: "0.82rem" }}>—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Anomalie sync */}
          {journee.sync_failed > 0 && (
            <div className="ctrl-anomalie-banner">
              <span className="icon">⚠️</span>
              <div>
                <div className="ctrl-anomalie-title">Anomalie de synchronisation détectée</div>
                <div className="ctrl-anomalie-desc">
                  {journee.sync_failed} ticket(s) n'ont pas été synchronisés correctement depuis l'application mobile.
                  La recette affichée peut être incomplète.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════════════════════

export default function ControleurRecettes() {
  const [journees, setJournees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [dateDebut, setDateDebut] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateFin, setDateFin] = useState(() => new Date().toISOString().split("T")[0]);

  const [searchReceveur, setSearchReceveur] = useState("");
  const [filterLigne, setFilterLigne] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalTransac, setModalTransac] = useState(null);
  const [modalDetail, setModalDetail] = useState(null);

  const fetchJournees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/controleur/journees`, {
        params: { debut: dateDebut, fin: dateFin },
      });
      setJournees(res.data.journees || []);
    } catch {
      setMessage({ text: "Erreur de connexion au serveur", type: "error" });
      setJournees([]);
    }
    setLoading(false);
  }, [dateDebut, dateFin]);

  useEffect(() => { fetchJournees(); }, [fetchJournees]);
  useEffect(() => { setCurrentPage(1); }, [searchReceveur, filterLigne, dateDebut, dateFin]);

  const lignesUniques = [...new Set(journees.map((j) => j.nom_ligne).filter(Boolean))].sort();

  const filtered = journees.filter((j) => {
    const q = searchReceveur.toLowerCase();
    const matchReceveur =
      !q ||
      `${j.prenom} ${j.nom}`.toLowerCase().includes(q) ||
      String(j.matricule_agent).includes(q);
    const matchLigne = !filterLigne || j.nom_ligne === filterLigne;
    return matchReceveur && matchLigne;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalRecette  = filtered.reduce((s, j) => s + Number(j.recette_ms  || 0), 0);
  const totalTickets  = filtered.reduce((s, j) => s + Number(j.nb_tickets  || 0), 0);
  const totalPayants  = filtered.reduce((s, j) => s + Number(j.nb_payants  || 0), 0);
  const totalGratuits = filtered.reduce((s, j) => s + Number(j.nb_gratuits || 0), 0);

  const handleExportGlobal = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Date", "Ligne", "Matricule", "Receveur", "Début", "Fin",
       "Tickets", "Payants", "Gratuits", "Recette (ms)", "Recette (DT)"],
      ...filtered.map((j) => [
        fmtDate(j.date),
        j.nom_ligne || "—",
        j.matricule_agent,
        `${j.prenom} ${j.nom}`,
        fmtTime(j.debut_service),
        fmtTime(j.fin_service),
        j.nb_tickets || 0,
        j.nb_payants || 0,
        j.nb_gratuits || 0,
        Number(j.recette_ms) || 0,
        fmtDT(j.recette_ms),
      ]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Recettes");
    XLSX.writeFile(wb, `recettes_${dateDebut}_${dateFin}.xlsx`);
  };

  return (
    <div>
      <Notification message={message} onDone={() => setMessage({ text: "", type: "" })} />

      {modalTransac && (
        <ModalTransactions journee={modalTransac} onClose={() => setModalTransac(null)} />
      )}
      {modalDetail && (
        <ModalRapportDetail journee={modalDetail} onClose={() => setModalDetail(null)} />
      )}

      {/* Header */}
      <div className="breadcrumb">SRTB › Contrôleur › <span>Contrôle des recettes</span></div>
      <div className="page-header">
        <div>
          <div className="page-title">Contrôle des recettes</div>
          <div className="page-subtitle">Vérification et validation des journées par receveur</div>
        </div>
        <button className="btn btn-gold" onClick={handleExportGlobal}>
          ⬇ Exporter rapport global
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-controleur-grid">
        <div className="kpi-controleur-card green">
          <div className="kpi-ctrl-icon">💰</div>
          <div className="kpi-ctrl-body">
            <div className="kpi-ctrl-value">{fmtDT(totalRecette)}</div>
            <div className="kpi-ctrl-label">Recette totale</div>
          </div>
        </div>
        <div className="kpi-controleur-card navy">
          <div className="kpi-ctrl-icon">🎟️</div>
          <div className="kpi-ctrl-body">
            <div className="kpi-ctrl-value">{fmt(totalTickets)}</div>
            <div className="kpi-ctrl-label">Total tickets</div>
          </div>
        </div>
        <div className="kpi-controleur-card navy">
          <div className="kpi-ctrl-icon">✓</div>
          <div className="kpi-ctrl-body">
            <div className="kpi-ctrl-value">{fmt(totalPayants)}</div>
            <div className="kpi-ctrl-label">Tickets payants</div>
          </div>
        </div>
        <div className="kpi-controleur-card gold">
          <div className="kpi-ctrl-icon">○</div>
          <div className="kpi-ctrl-body">
            <div className="kpi-ctrl-value">{fmt(totalGratuits)}</div>
            <div className="kpi-ctrl-label">Tickets gratuits</div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="card ctrl-filter-card">
        <div className="form-section-title" style={{ marginBottom: 14 }}>Filtres</div>
        <div className="ctrl-filter-grid">
          <div>
            <label className="form-label">Receveur</label>
            <input
              className="search-input"
              style={{ margin: 0 }}
              placeholder="Nom, prénom ou matricule..."
              value={searchReceveur}
              onChange={(e) => setSearchReceveur(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Date début</label>
            <input type="date" className="form-input" value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Date fin</label>
            <input type="date" className="form-input" value={dateFin}
              onChange={(e) => setDateFin(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Ligne</label>
            <select className="form-input" value={filterLigne}
              onChange={(e) => setFilterLigne(e.target.value)}>
              <option value="">Toutes les lignes</option>
              {lignesUniques.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn btn-gray" style={{ width: "100%" }} onClick={fetchJournees}>
              🔄 Actualiser
            </button>
          </div>
        </div>
        <p className="ctrl-filter-info">
          <strong>{filtered.length}</strong> journée(s) — du{" "}
          <strong>{fmtDate(dateDebut)}</strong> au <strong>{fmtDate(dateFin)}</strong>
        </p>
      </div>

      {/* Tableau */}
      <div className="card ctrl-table-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--gray-400)" }}>
            Chargement des données...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--gray-400)" }}>
            Aucune journée trouvée pour cette période
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Ligne</th>
                    <th>Matricule</th>
                    <th>Receveur</th>
                    <th>Début</th>
                    <th>Fin</th>
                    <th>Tickets</th>
                    <th>Payants</th>
                    <th>Gratuits</th>
                    <th>Recette</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((j, idx) => (
                    <tr
                      key={`${j.date}-${j.matricule_agent}-${j.id_ligne}-${idx}`}
                      className={j.sync_failed > 0 ? "ctrl-td-anomalie" : ""}
                    >
                      <td className="ctrl-td-date">{fmtDate(j.date)}</td>
                      <td className="ctrl-td-ligne">{j.nom_ligne || "—"}</td>
                      <td><span className="badge-matricule">{j.matricule_agent}</span></td>
                      <td style={{ fontWeight: 500 }}>{j.prenom} {j.nom}</td>
                      <td className="ctrl-td-time">{fmtTime(j.debut_service)}</td>
                      <td className="ctrl-td-time">{fmtTime(j.fin_service)}</td>
                      <td className="ctrl-td-center">{j.nb_tickets || 0}</td>
                      <td className="ctrl-td-payants">{j.nb_payants || 0}</td>
                      <td className="ctrl-td-gratuits">{j.nb_gratuits || 0}</td>
                      <td><span className="montant-badge">{fmt(j.recette_ms)} ms</span></td>
                      <td>
                        <div className="ctrl-action-btns">
                          <button
                            className="btn-ctrl-transac"
                            onClick={() => setModalTransac(j)}
                            title="Voir les transactions"
                          >
                            🧾 Transaction
                          </button>
                          <button
                            className="btn-ctrl-detail"
                            onClick={() => setModalDetail(j)}
                            title="Voir le rapport détaillé"
                          >
                            👁 Détail
                          </button>
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

            <div className="ctrl-table-footer">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} sur{" "}
              {filtered.length} journée(s)
            </div>
          </>
        )}
      </div>
    </div>
  );
}