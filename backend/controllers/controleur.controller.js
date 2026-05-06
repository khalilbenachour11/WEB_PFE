// backend/controllers/controleur.controller.js
const db = require("../database");

const toLocalDateStr = (d) => {
  if (!d) return null;
  if (d instanceof Date) {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  return String(d).split("T")[0];
};

// ──────────────────────────────────────────────────────────────────────────────
// Helper : construit la clause WHERE + params pour ticket_vendu
//
// RÈGLE CLÉ : même quand voyage_ids est fourni, on filtre TOUJOURS par
// DATE(tv.date_heure) = ? car un même voyage peut couvrir plusieurs journées
// (ex : voyage de nuit démarré la veille). Sans ce filtre, les modals
// ramènent des tickets d'autres jours que celui affiché dans le tableau.
// ──────────────────────────────────────────────────────────────────────────────
const buildTicketFilter = ({ voyage_ids, matricule_agent, date, id_ligne }) => {
  const dateFormatted = String(date).split("T")[0];

  if (voyage_ids) {
    const ids = String(voyage_ids).split(",").map(Number).filter(Boolean);
    if (ids.length === 0) return null;

    const placeholders = ids.map(() => "?").join(",");
    return {
      joinClause:  "",
      // CORRECTION : ajout du filtre date même en mode voyage_ids
      whereClause: `tv.id_voyage IN (${placeholders}) AND DATE(tv.date_heure) = ?`,
      params:      [...ids, dateFormatted],
    };
  }

  const ligneClause = id_ligne ? "AND v.id_ligne = ?" : "";
  const params      = [matricule_agent, dateFormatted];
  if (id_ligne) params.push(id_ligne);

  return {
    joinClause:  "JOIN billetterie.voyage v ON tv.id_voyage = v.id_voyage",
    whereClause: `v.matricule_agent = ? AND DATE(tv.date_heure) = ? ${ligneClause}`,
    params,
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/controleur/journees
// ──────────────────────────────────────────────────────────────────────────────
exports.getJournees = async (req, res) => {
  const { debut, fin } = req.query;

  try {
    const query = `
      SELECT
        DATE(tv.date_heure)                                                   AS date,
        v.matricule_agent,
        ag.nom,
        ag.prenom,
        v.id_ligne,
        l.nom_ligne,
        MIN(tv.date_heure)                                                    AS debut_service,
        MAX(tv.date_heure)                                                    AS fin_service,
        SUM(tv.quantite)                                                      AS nb_tickets,
        SUM(CASE WHEN tv.montant_total > 0 THEN tv.quantite ELSE 0 END)      AS nb_payants,
        SUM(CASE WHEN tv.montant_total = 0 THEN tv.quantite ELSE 0 END)      AS nb_gratuits,
        COALESCE(SUM(tv.montant_total), 0)                                    AS recette_ms,
        GROUP_CONCAT(DISTINCT v.id_voyage ORDER BY v.id_voyage)               AS voyage_ids
      FROM billetterie.ticket_vendu tv
      JOIN billetterie.voyage v ON tv.id_voyage = v.id_voyage
      JOIN base_global.agent ag ON v.matricule_agent = ag.matricule_agent
      LEFT JOIN base_global.ligne l ON v.id_ligne = l.id_ligne
      WHERE ag.role = 'agent'
        ${debut ? "AND DATE(tv.date_heure) >= ?" : ""}
        ${fin   ? "AND DATE(tv.date_heure) <= ?" : ""}
      GROUP BY
        DATE(tv.date_heure),
        v.matricule_agent,
        v.id_ligne,
        ag.nom,
        ag.prenom,
        l.nom_ligne
      ORDER BY date DESC, recette_ms DESC
    `;

    const params = [debut, fin].filter(Boolean);
    const [rows] = await db.promise().query(query, params);

    const journees = rows.map((r) => ({
      ...r,
      date:          toLocalDateStr(r.date),
      debut_service: r.debut_service,
      fin_service:   r.fin_service,
      voyage_ids:    r.voyage_ids ? r.voyage_ids.split(",").map(Number) : [],
    }));

    res.json({ success: true, journees });
  } catch (err) {
    console.error("Erreur getJournees:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/controleur/tickets
// ──────────────────────────────────────────────────────────────────────────────
exports.getTickets = async (req, res) => {
  const { matricule_agent, date, id_ligne, voyage_ids } = req.query;

  if (!matricule_agent || !date) {
    return res.json({ success: false, message: "matricule_agent et date requis" });
  }

  const filter = buildTicketFilter({ voyage_ids, matricule_agent, date, id_ligne });
  if (filter === null) return res.json({ success: true, tickets: [] });

  const { joinClause, whereClause, params } = filter;

  try {
    const [tickets] = await db.promise().query(
      `SELECT
        tv.id_ticket, tv.id_voyage, tv.id_segment,
        tv.point_depart, tv.point_arrivee, tv.type_tarif,
        tv.quantite, tv.prix_unitaire, tv.montant_total, tv.date_heure
      FROM billetterie.ticket_vendu tv
      ${joinClause}
      WHERE ${whereClause}
      ORDER BY tv.date_heure ASC`,
      params
    );

    res.json({ success: true, tickets });
  } catch (err) {
    console.error("Erreur getTickets:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/controleur/rapport_detail
// ──────────────────────────────────────────────────────────────────────────────
exports.getRapportDetail = async (req, res) => {
  const { matricule_agent, date, id_ligne, voyage_ids } = req.query;

  if (!matricule_agent || !date) {
    return res.json({ success: false, message: "matricule_agent et date requis" });
  }

  const filter = buildTicketFilter({ voyage_ids, matricule_agent, date, id_ligne });
  if (filter === null) {
    return res.json({
      success: true, total_ms: 0, nb_tickets: 0, nb_payants: 0,
      nb_gratuits: 0, tickets: [], par_tarif: [], par_voyage: [],
    });
  }

  const { joinClause, whereClause, params } = filter;
  const db_ = db.promise();
  const dateFormatted = String(date).split("T")[0];

  try {
    const [
      [resumeRows],
      [par_tarif],
      [tickets],
    ] = await Promise.all([
      db_.query(
        `SELECT
          SUM(tv.quantite)                                                    AS nb_tickets,
          SUM(CASE WHEN tv.montant_total > 0 THEN tv.quantite ELSE 0 END)   AS nb_payants,
          SUM(CASE WHEN tv.montant_total = 0 THEN tv.quantite ELSE 0 END)   AS nb_gratuits,
          COALESCE(SUM(tv.montant_total), 0)                                 AS total_ms
        FROM billetterie.ticket_vendu tv ${joinClause}
        WHERE ${whereClause}`,
        params
      ),
      db_.query(
        `SELECT tv.type_tarif,
          SUM(tv.quantite)      AS quantite,
          SUM(tv.montant_total) AS total
        FROM billetterie.ticket_vendu tv ${joinClause}
        WHERE ${whereClause}
        GROUP BY tv.type_tarif
        ORDER BY total DESC`,
        params
      ),
      db_.query(
        `SELECT
          tv.id_ticket, tv.id_voyage, tv.point_depart, tv.point_arrivee,
          tv.type_tarif, tv.quantite, tv.prix_unitaire, tv.montant_total, tv.date_heure
        FROM billetterie.ticket_vendu tv ${joinClause}
        WHERE ${whereClause}
        ORDER BY tv.date_heure ASC`,
        params
      ),
    ]);

    const resume = resumeRows[0] || { nb_tickets: 0, nb_payants: 0, nb_gratuits: 0, total_ms: 0 };

    // par_voyage : filtré par date dans les deux cas
    let par_voyage;
    if (voyage_ids) {
      const ids = String(voyage_ids).split(",").map(Number).filter(Boolean);
      const placeholders = ids.map(() => "?").join(",");
      [par_voyage] = await db_.query(
        `SELECT
          v.id_voyage, v.type, v.id_ligne, l.nom_ligne,
          SUM(CASE WHEN DATE(tv.date_heure) = ? THEN COALESCE(tv.quantite, 0) ELSE 0 END)            AS nb_tickets,
          SUM(CASE WHEN DATE(tv.date_heure) = ? AND tv.montant_total = 0 THEN tv.quantite ELSE 0 END) AS nb_gratuits,
          SUM(CASE WHEN DATE(tv.date_heure) = ? AND tv.montant_total > 0 THEN tv.quantite ELSE 0 END) AS nb_payants,
          COALESCE(SUM(CASE WHEN DATE(tv.date_heure) = ? THEN tv.montant_total ELSE 0 END), 0)        AS total
        FROM billetterie.voyage v
        LEFT JOIN billetterie.ticket_vendu tv ON v.id_voyage = tv.id_voyage
        LEFT JOIN base_global.ligne l         ON v.id_ligne  = l.id_ligne
        WHERE v.id_voyage IN (${placeholders})
        GROUP BY v.id_voyage, v.type, v.id_ligne, l.nom_ligne
        ORDER BY total DESC`,
        [dateFormatted, dateFormatted, dateFormatted, dateFormatted, ...ids]
      );
    } else {
      const ligneClause  = id_ligne ? "AND v.id_ligne = ?" : "";
      const voyageParams = [dateFormatted, matricule_agent, dateFormatted];
      if (id_ligne) voyageParams.push(id_ligne);

      [par_voyage] = await db_.query(
        `SELECT
          v.id_voyage, v.type, v.id_ligne, l.nom_ligne,
          SUM(COALESCE(tv.quantite, 0))                                        AS nb_tickets,
          SUM(CASE WHEN tv.montant_total = 0 THEN tv.quantite ELSE 0 END)     AS nb_gratuits,
          SUM(CASE WHEN tv.montant_total > 0 THEN tv.quantite ELSE 0 END)     AS nb_payants,
          COALESCE(SUM(tv.montant_total), 0)                                   AS total
        FROM billetterie.voyage v
        LEFT JOIN billetterie.ticket_vendu tv
          ON v.id_voyage = tv.id_voyage AND DATE(tv.date_heure) = ?
        LEFT JOIN base_global.ligne l ON v.id_ligne = l.id_ligne
        WHERE v.matricule_agent = ? AND DATE(v.date_heure) = ? ${ligneClause}
        GROUP BY v.id_voyage, v.type, v.id_ligne, l.nom_ligne
        ORDER BY total DESC`,
        voyageParams
      );
    }

    res.json({ success: true, ...resume, tickets, par_tarif, par_voyage });
  } catch (err) {
    console.error("Erreur getRapportDetail:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};