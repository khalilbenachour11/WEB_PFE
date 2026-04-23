import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import "../styles/global.css";
import Notification from "../components/Notification";
import Pagination from "../components/Pagination";

const API = "http://localhost:5000/api";
const ITEMS_PER_PAGE = 15;

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");
// montant_total est en millimes (ms), 1 DT = 1000 ms
// MySQL retourne les SUM() comme strings → forcer Number()
const fmtDT = (ms) => {
  const val = Number(ms || 0);
  if (!isFinite(val) || isNaN(val)) return "— DT";
  return (val / 1000).toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " DT";
};
const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// ── Modal Transactions ────────────────────────────────────────────────────────

function ModalTransactions({ journee, onClose }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/controleur/tickets`, {
        params: {
          matricule_agent: journee.matricule_agent,
          date: journee.date,
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

  const exportTransactions = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["#", "Date", "Heure", "Voyage", "Départ", "Arrivée", "Tarif", "Qté", "Prix unit. (ms)", "Total (ms)"],
      ...filtered.map((t, i) => [
        i + 1,
        fmtDate(t.date_heure),
        t.date_heure ? new Date(t.date_heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—",
        `#${t.id_voyage}`,
        t.point_depart,
        t.point_arrivee,
        t.type_tarif,
        t.quantite,
        t.prix_unitaire,
        t.montant_total,
      ]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `transactions_${journee.matricule_agent}_${journee.date}.xlsx`);
  };

  const totalPayant = filtered.reduce(
    (s, t) => s + (t.montant_total > 0 ? t.montant_total : 0),
    0
  );
  const nbGratuits = filtered.filter((t) => t.montant_total === 0).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 900, width: "96vw", maxHeight: "92vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              🧾 Transactions — {journee.prenom} {journee.nom}
            </h2>
            <div style={{ fontSize: "0.78rem", color: "var(--gray-400)", marginTop: 2 }}>
              Journée du {fmtDate(journee.date)} · Ligne {journee.nom_ligne || `#${journee.id_ligne}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              className="btn btn-gold"
              style={{ fontSize: "0.82rem", padding: "8px 16px" }}
              onClick={exportTransactions}
            >
              ⬇ Exporter
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* KPIs mini */}
        <div style={{ display: "flex", gap: 12, padding: "16px 28px 8px", flexWrap: "wrap" }}>
          {[
            { label: "Total transactions", value: filtered.length, color: "var(--navy)" },
            { label: "Recette totale", value: fmtDT(totalPayant), color: "var(--green)" },
            { label: "Tickets gratuits", value: nbGratuits, color: "var(--gold)" },
          ].map((k) => (
            <div
              key={k.label}
              style={{
                background: "var(--offwhite)",
                borderRadius: 10,
                padding: "10px 18px",
                border: "1px solid var(--gray-100)",
                flex: 1,
                minWidth: 140,
              }}
            >
              <div style={{ fontSize: "0.72rem", color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                {k.label}
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: k.color, marginTop: 4 }}>
                {k.value}
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ padding: "0 28px 12px" }}>
          <input
            className="search-input"
            style={{ margin: 0 }}
            placeholder="Rechercher par tarif, départ, arrivée..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div style={{ padding: "0 28px 20px", overflowX: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--gray-400)" }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--gray-400)" }}>
              Aucune transaction trouvée
            </div>
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
                  <th>Prix unit.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const isGratuit = t.montant_total === 0;
                  return (
                    <tr key={t.id_ticket}>
                      <td style={{ color: "var(--gray-400)", fontSize: "0.75rem" }}>{i + 1}</td>
                      <td style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                        {t.date_heure
                          ? new Date(t.date_heure).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td>
                        <span className="badge-matricule">#{t.id_voyage}</span>
                      </td>
                      <td style={{ fontSize: "0.87rem" }}>
                        <span style={{ color: "var(--navy)", fontWeight: 500 }}>{t.point_depart}</span>
                        <span style={{ color: "var(--gray-400)", margin: "0 6px" }}>→</span>
                        <span>{t.point_arrivee}</span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 10px",
                            borderRadius: 20,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: isGratuit
                              ? "rgba(27,107,58,0.1)"
                              : "rgba(13,43,94,0.08)",
                            color: isGratuit ? "var(--green)" : "var(--navy)",
                          }}
                        >
                          {t.type_tarif}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>{t.quantite}</td>
                      <td style={{ color: "var(--gray-600)", fontSize: "0.85rem" }}>
                        {isGratuit ? "—" : `${fmt(t.prix_unitaire)} ms`}
                      </td>
                      <td>
                        {isGratuit ? (
                          <span style={{ color: "var(--green)", fontWeight: 600, fontSize: "0.82rem" }}>Gratuit</span>
                        ) : (
                          <span className="montant-badge">{fmt(t.montant_total)} ms</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--navy)" }}>
                  <td colSpan={4} style={{ color: "var(--gold)", fontWeight: 700, fontSize: "0.82rem", padding: "10px 18px", letterSpacing: "1px", textTransform: "uppercase" }}>
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

// ── Modal Rapport Détaillé ────────────────────────────────────────────────────

function ModalRapportDetail({ journee, onClose }) {
  const [rapport, setRapport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API}/controleur/rapport_detail`, {
        params: {
          matricule_agent: journee.matricule_agent,
          date: journee.date,
        },
      })
      .then((r) => setRapport(r.data))
      .catch(() => setRapport(null))
      .finally(() => setLoading(false));
  }, [journee]);

  const exportRapport = () => {
    if (!rapport) return;
    const wb = XLSX.utils.book_new();

    // Résumé
    const ws1 = XLSX.utils.aoa_to_sheet([
      [`RAPPORT JOURNÉE — ${fmtDate(journee.date)}`],
      [`Agent : ${journee.prenom} ${journee.nom}`],
      [],
      ["Indicateur", "Valeur"],
      ["Recette totale (ms)", rapport.total_ms],
      ["Recette totale (DT)", fmtDT(rapport.total_ms)],
      ["Total tickets vendus", rapport.nb_tickets],
      ["Tickets payants", rapport.nb_payants],
      ["Tickets gratuits", rapport.nb_gratuits],
      ["Prix moyen/ticket (ms)", rapport.nb_payants > 0 ? Math.round(rapport.total_ms / rapport.nb_payants) : 0],
      ["Taux de gratuité", `${rapport.nb_tickets > 0 ? ((rapport.nb_gratuits / rapport.nb_tickets) * 100).toFixed(1) : 0}%`],
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, "Résumé");

    // Tickets
    const ws2 = XLSX.utils.aoa_to_sheet([
      ["#", "Date", "Heure", "Voyage", "Départ", "Arrivée", "Tarif", "Qté", "Prix unit. (ms)", "Total (ms)"],
      ...(rapport.tickets || []).map((t, i) => [
        i + 1,
        fmtDate(t.date_heure),
        t.date_heure ? new Date(t.date_heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—",
        `#${t.id_voyage}`,
        t.point_depart,
        t.point_arrivee,
        t.type_tarif,
        t.quantite,
        t.prix_unitaire,
        t.montant_total,
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws2, "Tickets");

    // Par tarif
    const ws3 = XLSX.utils.aoa_to_sheet([
      ["Type de tarif", "Quantité", "Total (ms)", "% du total"],
      ...(rapport.par_tarif || []).map((r) => [
        r.type_tarif,
        r.quantite,
        r.total,
        rapport.total_ms > 0 ? `${((r.total / rapport.total_ms) * 100).toFixed(1)}%` : "0%",
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws3, "Par tarif");

    // Par voyage
    const ws4 = XLSX.utils.aoa_to_sheet([
      ["Voyage", "Type", "Ligne", "Tickets", "Gratuits", "Payants", "Recette (ms)"],
      ...(rapport.par_voyage || []).map((v) => [
        `#${v.id_voyage}`,
        v.type,
        v.nom_ligne,
        v.nb_tickets,
        v.nb_gratuits,
        v.nb_payants,
        v.total,
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws4, "Par voyage");

    XLSX.writeFile(wb, `rapport_journee_${journee.matricule_agent}_${journee.date}.xlsx`);
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-box" style={{ maxWidth: 420 }}>
          <div style={{ textAlign: "center", padding: 20, color: "var(--gray-400)" }}>
            Chargement du rapport...
          </div>
        </div>
      </div>
    );
  }

  // Si pas de rapport backend, on utilise les données de la journée directement
  const r = rapport || {
    total_ms: journee.recette_ms,
    nb_tickets: journee.nb_tickets,
    nb_payants: journee.nb_payants,
    nb_gratuits: journee.nb_gratuits,
    tickets: [],
    par_tarif: [],
    par_voyage: [],
  };

  const tauxGrat = r.nb_tickets > 0 ? ((r.nb_gratuits / r.nb_tickets) * 100).toFixed(1) : "0.0";
  const prixMoyen = r.nb_payants > 0 ? Math.round(r.total_ms / r.nb_payants) : 0;

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
            <button
              className="btn btn-gold"
              style={{ fontSize: "0.82rem", padding: "8px 16px" }}
              onClick={exportRapport}
            >
              ⬇ Exporter Excel
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={{ padding: "20px 28px" }}>
          {/* Résumé global */}
          <div className="form-section-title" style={{ marginBottom: 14 }}>
            Résumé de la journée
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { icon: "💰", label: "Recette totale", value: fmtDT(r.total_ms), sub: `${fmt(r.total_ms)} ms`, color: "var(--green)" },
              { icon: "🎟️", label: "Tickets vendus", value: r.nb_tickets, sub: `${r.nb_payants} payants · ${r.nb_gratuits} gratuits`, color: "var(--navy)" },
              { icon: "📉", label: "Taux de gratuité", value: `${tauxGrat}%`, sub: `Prix moyen : ${fmt(prixMoyen)} ms`, color: "var(--gold)" },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  background: "linear-gradient(135deg, var(--navy-dark), var(--navy))",
                  borderRadius: 12,
                  padding: "18px 20px",
                  borderLeft: `4px solid ${k.color}`,
                }}
              >
                <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>{k.icon}</div>
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  {k.label}
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: k.color, marginTop: 4, fontFamily: "'Playfair Display', serif" }}>
                  {k.value}
                </div>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Par tarif */}
          {r.par_tarif && r.par_tarif.length > 0 && (
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
                  {r.par_tarif.map((t) => (
                    <tr key={t.type_tarif}>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 10px",
                            borderRadius: 20,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: t.total === 0 ? "rgba(27,107,58,0.1)" : "rgba(13,43,94,0.08)",
                            color: t.total === 0 ? "var(--green)" : "var(--navy)",
                          }}
                        >
                          {t.type_tarif}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>{t.quantite}</td>
                      <td><span className="montant-badge">{fmt(t.total)} ms</span></td>
                      <td style={{ color: "var(--green)", fontWeight: 600 }}>{fmtDT(t.total)}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: "var(--gray-100)", borderRadius: 3, overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                width: r.total_ms > 0 ? `${(t.total / r.total_ms) * 100}%` : "0%",
                                background: "linear-gradient(90deg, var(--navy-light), var(--navy))",
                                borderRadius: 3,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: "0.78rem", color: "var(--gray-600)", whiteSpace: "nowrap" }}>
                            {r.total_ms > 0 ? ((t.total / r.total_ms) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Par voyage */}
          {r.par_voyage && r.par_voyage.length > 0 && (
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
                        {v.total > 0 ? (
                          <span className="montant-badge">{fmt(v.total)} ms</span>
                        ) : (
                          <span style={{ color: "var(--gray-400)", fontSize: "0.82rem" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Anomalies / sync */}
          {journee.sync_failed > 0 && (
            <div
              style={{
                marginTop: 20,
                background: "rgba(190,56,23,0.08)",
                border: "1px solid rgba(190,56,23,0.25)",
                borderRadius: 10,
                padding: "14px 18px",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: "1.3rem" }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, color: "var(--red)", fontSize: "0.88rem" }}>
                  Anomalie de synchronisation détectée
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--gray-600)", marginTop: 4 }}>
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

// ── Page Principale ───────────────────────────────────────────────────────────

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
  const [filterSync, setFilterSync] = useState("");

  const [modalTransac, setModalTransac] = useState(null);
  const [modalDetail, setModalDetail] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchJournees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/controleur/journees`, {
        params: { debut: dateDebut, fin: dateFin },
      });
      setJournees(res.data.journees || []);
    } catch {
      setMessage({ text: "Erreur de connexion au serveur.", type: "error" });
      setJournees([]);
    }
    setLoading(false);
  }, [dateDebut, dateFin]);

  useEffect(() => {
    fetchJournees();
  }, [fetchJournees]);

  // Filtres
  const lignesUniques = [...new Set(journees.map((j) => j.nom_ligne).filter(Boolean))];

  const filtered = journees.filter((j) => {
    const q = searchReceveur.toLowerCase();
    const matchReceveur =
      !q ||
      `${j.prenom} ${j.nom}`.toLowerCase().includes(q) ||
      String(j.matricule_agent).includes(q);
    const matchLigne = !filterLigne || j.nom_ligne === filterLigne;
    const matchSync =
      !filterSync ||
      (filterSync === "ok" && (!j.sync_failed || j.sync_failed === 0)) ||
      (filterSync === "anomalie" && j.sync_failed > 0);
    return matchReceveur && matchLigne && matchSync;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchReceveur, filterLigne, filterSync, dateDebut, dateFin]);

  // Totaux — forcer Number() car MySQL retourne les SUM() comme strings
  const totalRecette = filtered.reduce((s, j) => s + Number(j.recette_ms || 0), 0);
  const totalTickets = filtered.reduce((s, j) => s + Number(j.nb_tickets || 0), 0);
  const totalAnomalies = filtered.filter((j) => j.sync_failed > 0).length;

  const exportGlobal = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Date", "N° Ligne", "Ligne", "Matricule", "Receveur", "Début service", "Fin service", "Nb tickets", "Recette (ms)", "Recette (DT)", "Sync"],
      ...filtered.map((j) => [
        fmtDate(j.date),
        j.id_ligne,
        j.nom_ligne || "—",
        j.matricule_agent,
        `${j.prenom} ${j.nom}`,
        j.debut_service ? new Date(j.debut_service).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—",
        j.fin_service ? new Date(j.fin_service).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—",
        j.nb_tickets,
        Number(j.recette_ms),
        Number(Number(j.recette_ms) / 1000).toFixed(3),
        j.sync_failed > 0 ? "ANOMALIE" : "OK",
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
      <div className="breadcrumb">
        SRTB › Contrôleur › <span>Contrôle des recettes</span>
      </div>
      <div className="page-header">
        <div>
          <div className="page-title">Contrôle des recettes</div>
          <div className="page-subtitle">
            Vérification et validation des journées par receveur
          </div>
        </div>
        <button className="btn btn-gold" onClick={exportGlobal}>
          ⬇ Exporter rapport global
        </button>
      </div>

      {/* KPIs */}
      <div className="dashboard-cards" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { icon: "💰", label: "Recette totale", value: fmtDT(totalRecette), color: "green" },
          { icon: "🎟️", label: "Total tickets", value: fmt(totalTickets), color: "blue" },
          { icon: "📋", label: "Journées", value: filtered.length, color: "blue" },
          {
            icon: "⚠️",
            label: "Anomalies sync",
            value: totalAnomalies,
            color: "gold",
            warn: totalAnomalies > 0,
          },
        ].map((k) => (
          <div
            key={k.label}
            className={`dashboard-card ${k.color}`}
            style={k.warn && k.value > 0 ? { borderTop: "3px solid var(--red)" } : {}}
          >
            <div className="card-icon-wrap">{k.icon}</div>
            <div className="card-number" style={{ fontSize: "1.6rem" }}>
              {k.value}
            </div>
            <div className="card-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="card" style={{ marginBottom: 20, padding: "20px 24px" }}>
        <div className="form-section-title" style={{ marginBottom: 14 }}>Filtres</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, alignItems: "end" }}>
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
            <input
              type="date"
              className="form-input"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Date fin</label>
            <input
              type="date"
              className="form-input"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Ligne</label>
            <select
              className="form-input"
              value={filterLigne}
              onChange={(e) => setFilterLigne(e.target.value)}
            >
              <option value="">Toutes les lignes</option>
              {lignesUniques.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Synchronisation</label>
            <select
              className="form-input"
              value={filterSync}
              onChange={(e) => setFilterSync(e.target.value)}
            >
              <option value="">Toutes</option>
              <option value="ok">✅ Sync OK</option>
              <option value="anomalie">⚠️ Anomalie</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: "0.8rem", color: "var(--gray-400)" }}>
          <strong style={{ color: "var(--navy)" }}>{filtered.length}</strong> journée(s) — période du{" "}
          <strong>{fmtDate(dateDebut)}</strong> au <strong>{fmtDate(dateFin)}</strong>
        </div>
      </div>

      {/* Tableau */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--gray-400)" }}>
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--gray-400)" }}>
            Aucune journée trouvée
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>N° Ligne</th>
                    <th>Ligne</th>
                    <th>Matricule</th>
                    <th>Receveur</th>
                    <th>Début service</th>
                    <th>Fin service</th>
                    <th>Nb tickets</th>
                    <th>Recette</th>
                    <th>Sync</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((j, idx) => {
                    const hasAnomalie = j.sync_failed > 0;
                    return (
                      <tr key={idx} style={hasAnomalie ? { background: "rgba(190,56,23,0.04)" } : {}}>
                        <td style={{ whiteSpace: "nowrap", fontWeight: 500, fontSize: "0.85rem" }}>
                          {fmtDate(j.date)}
                        </td>
                        <td>
                          <span className="badge-role informatique" style={{ fontSize: "0.72rem" }}>
                            {j.id_ligne || "—"}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.87rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {j.nom_ligne || "—"}
                        </td>
                        <td>
                          <span className="badge-matricule">{j.matricule_agent}</span>
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {j.prenom} {j.nom}
                        </td>
                        <td style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                          {j.debut_service
                            ? new Date(j.debut_service).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                          {j.fin_service
                            ? new Date(j.fin_service).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>
                          {j.nb_tickets}
                        </td>
                        <td>
                          <span className="montant-badge">
                            {fmt(j.recette_ms)} ms
                          </span>
                        </td>
                        <td>
                          {hasAnomalie ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 10px",
                                borderRadius: 20,
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                background: "rgba(190,56,23,0.1)",
                                color: "var(--red)",
                                border: "1px solid rgba(190,56,23,0.25)",
                              }}
                            >
                              ⚠ {j.sync_failed} échec(s)
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 10px",
                                borderRadius: 20,
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                background: "rgba(27,107,58,0.1)",
                                color: "var(--green)",
                              }}
                            >
                              ✓ OK
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            <button
                              className="btn btn-red"
                              style={{ fontSize: "0.78rem", padding: "6px 12px" }}
                              onClick={() => setModalTransac(j)}
                              title="Voir les transactions"
                            >
                              🧾 Transaction
                            </button>
                            <button
                              className="btn"
                              style={{
                                fontSize: "0.78rem",
                                padding: "6px 12px",
                                background: "linear-gradient(135deg, #1a73e8, #0d47a1)",
                              }}
                              onClick={() => setModalDetail(j)}
                              title="Voir le rapport détaillé"
                            >
                              👁 Détail
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />

            <div
              style={{
                padding: "10px 16px",
                borderTop: "1px solid var(--gray-100)",
                fontSize: "12px",
                color: "var(--color-text-secondary)",
                textAlign: "center",
              }}
            >
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} sur {filtered.length} journée(s)
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── MOCK data (utilisé si le backend n'a pas encore les endpoints) ────────────