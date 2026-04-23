// backend/controllers/controleur.controller.js
const db = require("../database");

/**
 * GET /api/controleur/journees
 * Retourne une ligne par (receveur × voyage × date) avec recette agrégée.
 * Params: debut, fin (YYYY-MM-DD)
 */
exports.getJournees = async (req, res) => {
  const { debut, fin } = req.query;

  try {
    const [rows] = await db.promise().query(
      `SELECT
         DATE(tv.date_heure)                                        AS date,
         v.matricule_agent,
         ag.nom,
         ag.prenom,
         v.id_ligne,
         l.nom_ligne,
         MIN(tv.date_heure)                                         AS debut_service,
         MAX(tv.date_heure)                                         AS fin_service,
         COUNT(tv.id_ticket)                                        AS nb_tickets,
         SUM(CASE WHEN tv.montant_total > 0 THEN tv.quantite ELSE 0 END) AS nb_payants,
         SUM(CASE WHEN tv.montant_total = 0 THEN tv.quantite ELSE 0 END) AS nb_gratuits,
         COALESCE(SUM(tv.montant_total), 0)                        AS recette_ms,
         0                                                         AS sync_failed
       FROM billetterie.ticket_vendu tv
       JOIN billetterie.voyage        v  ON tv.id_voyage        = v.id_voyage
       JOIN base_global.agent         ag ON v.matricule_agent   = ag.matricule_agent
       LEFT JOIN base_global.ligne    l  ON v.id_ligne          = l.id_ligne
       WHERE ag.role = 'receveur'
         ${debut ? "AND DATE(tv.date_heure) >= ?" : ""}
         ${fin   ? "AND DATE(tv.date_heure) <= ?" : ""}
       GROUP BY DATE(tv.date_heure), v.matricule_agent, v.id_ligne
       ORDER BY date DESC, recette_ms DESC`,
      [debut, fin].filter(Boolean)
    );

    res.json({ success: true, journees: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/controleur/tickets
 * Transactions détaillées pour un receveur un jour donné.
 * Params: matricule_agent, date (YYYY-MM-DD)
 */
exports.getTickets = async (req, res) => {
  const { matricule_agent, date } = req.query;
  if (!matricule_agent || !date)
    return res.json({ success: false, message: "matricule_agent et date requis" });

  try {
    const [rows] = await db.promise().query(
      `SELECT
         tv.id_ticket,
         tv.id_voyage,
         tv.id_segment,
         tv.point_depart,
         tv.point_arrivee,
         tv.type_tarif,
         tv.quantite,
         tv.prix_unitaire,
         tv.montant_total,
         tv.date_heure
       FROM billetterie.ticket_vendu tv
       JOIN billetterie.voyage v ON tv.id_voyage = v.id_voyage
       WHERE v.matricule_agent = ?
         AND DATE(tv.date_heure) = ?
       ORDER BY tv.date_heure ASC`,
      [matricule_agent, date]
    );

    res.json({ success: true, tickets: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/controleur/rapport_detail
 * Rapport complet d'une journée : résumé + par tarif + par voyage.
 * Params: matricule_agent, date
 */
exports.getRapportDetail = async (req, res) => {
  const { matricule_agent, date } = req.query;
  if (!matricule_agent || !date)
    return res.json({ success: false, message: "matricule_agent et date requis" });

  try {
    // ── Résumé global ──
    const [[resume]] = await db.promise().query(
      `SELECT
         COUNT(tv.id_ticket)                                            AS nb_tickets,
         SUM(CASE WHEN tv.montant_total > 0 THEN tv.quantite ELSE 0 END) AS nb_payants,
         SUM(CASE WHEN tv.montant_total = 0 THEN tv.quantite ELSE 0 END) AS nb_gratuits,
         COALESCE(SUM(tv.montant_total), 0)                            AS total_ms
       FROM billetterie.ticket_vendu tv
       JOIN billetterie.voyage v ON tv.id_voyage = v.id_voyage
       WHERE v.matricule_agent = ? AND DATE(tv.date_heure) = ?`,
      [matricule_agent, date]
    );

    // ── Tickets détaillés ──
    const [tickets] = await db.promise().query(
      `SELECT tv.id_ticket, tv.id_voyage, tv.point_depart, tv.point_arrivee,
              tv.type_tarif, tv.quantite, tv.prix_unitaire, tv.montant_total, tv.date_heure
       FROM billetterie.ticket_vendu tv
       JOIN billetterie.voyage v ON tv.id_voyage = v.id_voyage
       WHERE v.matricule_agent = ? AND DATE(tv.date_heure) = ?
       ORDER BY tv.date_heure ASC`,
      [matricule_agent, date]
    );

    // ── Par type de tarif ──
    const [par_tarif] = await db.promise().query(
      `SELECT tv.type_tarif,
              SUM(tv.quantite)     AS quantite,
              SUM(tv.montant_total) AS total
       FROM billetterie.ticket_vendu tv
       JOIN billetterie.voyage v ON tv.id_voyage = v.id_voyage
       WHERE v.matricule_agent = ? AND DATE(tv.date_heure) = ?
       GROUP BY tv.type_tarif
       ORDER BY total DESC`,
      [matricule_agent, date]
    );

    // ── Par voyage ──
    const [par_voyage] = await db.promise().query(
      `SELECT
         v.id_voyage,
         v.type,
         v.id_ligne,
         l.nom_ligne,
         COUNT(tv.id_ticket)                                            AS nb_tickets,
         SUM(CASE WHEN tv.montant_total = 0 THEN tv.quantite ELSE 0 END) AS nb_gratuits,
         SUM(CASE WHEN tv.montant_total > 0 THEN tv.quantite ELSE 0 END) AS nb_payants,
         COALESCE(SUM(tv.montant_total), 0)                            AS total
       FROM billetterie.voyage v
       LEFT JOIN billetterie.ticket_vendu tv ON v.id_voyage = tv.id_voyage
                                             AND DATE(tv.date_heure) = ?
       LEFT JOIN base_global.ligne l ON v.id_ligne = l.id_ligne
       WHERE v.matricule_agent = ?
         AND DATE(v.date_heure) = ?
       GROUP BY v.id_voyage, v.type, v.id_ligne, l.nom_ligne
       ORDER BY total DESC`,
      [date, matricule_agent, date]
    );

    res.json({
      success: true,
      ...resume,
      tickets,
      par_tarif,
      par_voyage,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};