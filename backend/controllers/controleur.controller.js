// backend/controllers/controleur.controller.js
const db = require("../database");

/**
 * GET /api/controleur/journees
 * Retourne les journées avec recette agrégée
 */
exports.getJournees = async (req, res) => {
  const { debut, fin } = req.query;

  try {
    const query = `
      SELECT
        DATE(CONVERT_TZ(tv.date_heure, 'UTC', 'Africa/Tunis')) AS date,
        v.matricule_agent,
        ag.nom,
        ag.prenom,
        v.id_ligne,
        l.nom_ligne,
        MIN(CONVERT_TZ(tv.date_heure, 'UTC', 'Africa/Tunis')) AS debut_service,
        MAX(CONVERT_TZ(tv.date_heure, 'UTC', 'Africa/Tunis')) AS fin_service,
        COUNT(tv.id_ticket) AS nb_tickets,
        SUM(CASE WHEN tv.montant_total > 0 THEN tv.quantite ELSE 0 END) AS nb_payants,
        SUM(CASE WHEN tv.montant_total = 0 THEN tv.quantite ELSE 0 END) AS nb_gratuits,
        COALESCE(SUM(tv.montant_total), 0) AS recette_ms
      FROM billetterie.ticket_vendu tv
      JOIN billetterie.voyage v ON tv.id_voyage = v.id_voyage
      JOIN base_global.agent ag ON v.matricule_agent = ag.matricule_agent
      LEFT JOIN base_global.ligne l ON v.id_ligne = l.id_ligne
      WHERE ag.role = 'receveur'
        ${debut ? "AND DATE(CONVERT_TZ(tv.date_heure, 'UTC', 'Africa/Tunis')) >= ?" : ""}
        ${fin ? "AND DATE(CONVERT_TZ(tv.date_heure, 'UTC', 'Africa/Tunis')) <= ?" : ""}
      GROUP BY 
        DATE(CONVERT_TZ(tv.date_heure, 'UTC', 'Africa/Tunis')), 
        v.matricule_agent, 
        v.id_ligne,
        ag.nom,
        ag.prenom,
        l.nom_ligne
      ORDER BY date DESC, recette_ms DESC
    `;

    const params = [debut, fin].filter(Boolean);
    const [rows] = await db.promise().query(query, params);

    res.json({ success: true, journees: rows });
  } catch (err) {
    console.error("❌ Erreur getJournees:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/controleur/tickets
 * Transactions détaillées pour un receveur un jour donné
 */
exports.getTickets = async (req, res) => {
  const { matricule_agent, date } = req.query;

  if (!matricule_agent || !date) {
    return res.json({
      success: false,
      message: "matricule_agent et date requis",
    });
  }

  try {
    // Formater la date correctement
    const dateFormatted = new Date(date).toISOString().split("T")[0];

    console.log("📍 getTickets:", { matricule_agent, dateFormatted });

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
        CONVERT_TZ(tv.date_heure, 'UTC', 'Africa/Tunis') AS date_heure
      FROM billetterie.ticket_vendu tv
      JOIN billetterie.voyage v ON tv.id_voyage = v.id_voyage
      WHERE v.matricule_agent = ?
        AND DATE(CONVERT_TZ(tv.date_heure, 'UTC', 'Africa/Tunis')) = ?
      ORDER BY tv.date_heure ASC`,
      [matricule_agent, dateFormatted]
    );

    console.log("✅ Tickets trouvés:", rows.length);

    res.json({ success: true, tickets: rows });
  } catch (err) {
    console.error("❌ Erreur getTickets:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/controleur/rapport_detail
 * Rapport complet avec résumé + par tarif + par voyage
 */
exports.getRapportDetail = async (req, res) => {
  const { matricule_agent, date } = req.query;

  if (!matricule_agent || !date) {
    return res.json({
      success: false,
      message: "matricule_agent et date requis",
    });
  }

  try {
    // Formater la date correctement
    const dateFormatted = new Date(date).toISOString().split("T")[0];

    console.log("📍 getRapportDetail:", { matricule_agent, dateFormatted });

    // ── Résumé global ──
    const [[resume]] = await db.promise().query(
      `SELECT
        COUNT(tv.id_ticket) AS nb_tickets,
        SUM(CASE WHEN tv.montant_total > 0 THEN tv.quantite ELSE 0 END) AS nb_payants,
        SUM(CASE WHEN tv.montant_total = 0 THEN tv.quantite ELSE 0 END) AS nb_gratuits,
        COALESCE(SUM(tv.montant_total), 0) AS total_ms
      FROM billetterie.ticket_vendu tv
      JOIN billetterie.voyage v ON tv.id_voyage = v.id_voyage
      WHERE v.matricule_agent = ?
        AND DATE(CONVERT_TZ(tv.date_heure, 'UTC', 'Africa/Tunis')) = ?`,
      [matricule_agent, dateFormatted]
    );

    // ── Tickets détaillés ──
    const [tickets] = await db.promise().query(
      `SELECT
        tv.id_ticket,
        tv.id_voyage,
        tv.point_depart,
        tv.point_arrivee,
        tv.type_tarif,
        tv.quantite,
        tv.prix_unitaire,
        tv.montant_total,
        CONVERT_TZ(tv.date_heure, 'UTC', 'Africa/Tunis') AS date_heure
      FROM billetterie.ticket_vendu tv
      JOIN billetterie.voyage v ON tv.id_voyage = v.id_voyage
      WHERE v.matricule_agent = ?
        AND DATE(CONVERT_TZ(tv.date_heure, 'UTC', 'Africa/Tunis')) = ?
      ORDER BY tv.date_heure ASC`,
      [matricule_agent, dateFormatted]
    );

    // ── Par type de tarif ──
    const [par_tarif] = await db.promise().query(
      `SELECT
        tv.type_tarif,
        SUM(tv.quantite) AS quantite,
        SUM(tv.montant_total) AS total
      FROM billetterie.ticket_vendu tv
      JOIN billetterie.voyage v ON tv.id_voyage = v.id_voyage
      WHERE v.matricule_agent = ?
        AND DATE(CONVERT_TZ(tv.date_heure, 'UTC', 'Africa/Tunis')) = ?
      GROUP BY tv.type_tarif
      ORDER BY total DESC`,
      [matricule_agent, dateFormatted]
    );

    // ── Par voyage ──
    const [par_voyage] = await db.promise().query(
      `SELECT
        v.id_voyage,
        v.type,
        v.id_ligne,
        l.nom_ligne,
        COUNT(tv.id_ticket) AS nb_tickets,
        SUM(CASE WHEN tv.montant_total = 0 THEN tv.quantite ELSE 0 END) AS nb_gratuits,
        SUM(CASE WHEN tv.montant_total > 0 THEN tv.quantite ELSE 0 END) AS nb_payants,
        COALESCE(SUM(tv.montant_total), 0) AS total
      FROM billetterie.voyage v
      LEFT JOIN billetterie.ticket_vendu tv
        ON v.id_voyage = tv.id_voyage
        AND DATE(CONVERT_TZ(tv.date_heure, 'UTC', 'Africa/Tunis')) = ?
      LEFT JOIN base_global.ligne l ON v.id_ligne = l.id_ligne
      WHERE v.matricule_agent = ?
        AND DATE(CONVERT_TZ(v.date_heure, 'UTC', 'Africa/Tunis')) = ?
      GROUP BY v.id_voyage, v.type, v.id_ligne, l.nom_ligne
      ORDER BY total DESC`,
      [dateFormatted, matricule_agent, dateFormatted]
    );

    console.log("✅ Données trouvées:", {
      nb_tickets: resume.nb_tickets,
      total_ms: resume.total_ms,
      tickets_count: tickets.length,
      par_tarif_count: par_tarif.length,
      par_voyage_count: par_voyage.length,
    });

    res.json({
      success: true,
      ...resume,
      tickets,
      par_tarif,
      par_voyage,
    });
  } catch (err) {
    console.error("❌ Erreur getRapportDetail:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};