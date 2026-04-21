const db = require("../database");

/**
 * GET /api/voyage_historique
 * Retourne toutes les entrées d'audit, enrichies avec les infos receveur et ligne.
 * Supports query params: id_voyage, statut, start, end
 */
exports.getHistorique = async (req, res) => {
  try {
    const { id_voyage, statut, start, end, matricule } = req.query;

    let sql = `
      SELECT
        vh.id,
        vh.id_voyage,
        vh.id_ligne,
        vh.matricule_agent,
        vh.statut_avant,
        vh.statut_apres,
        vh.created_at,
        l.nom_ligne,
        a.nom,
        a.prenom
      FROM billetterie.voyage_historique vh
      LEFT JOIN base_global.ligne  l  ON vh.id_ligne       = l.id_ligne
      LEFT JOIN base_global.agent  a  ON vh.matricule_agent = a.matricule_agent
      WHERE 1=1
    `;
    const params = [];

    if (id_voyage) {
      sql += " AND vh.id_voyage = ?";
      params.push(id_voyage);
    }
    if (statut) {
      sql += " AND vh.statut_apres = ?";
      params.push(statut);
    }
    if (matricule) {
      sql += " AND vh.matricule_agent = ?";
      params.push(matricule);
    }
    if (start) {
      sql += " AND vh.created_at >= ?";
      params.push(start + " 00:00:00");
    }
    if (end) {
      sql += " AND vh.created_at <= ?";
      params.push(end + " 23:59:59");
    }

    sql += " ORDER BY vh.created_at DESC";

    const [rows] = await db.promise().query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/voyage_historique/:id_voyage
 * Retourne l'historique complet d'un voyage précis.
 */
exports.getHistoriqueByVoyage = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT
        vh.id,
        vh.statut_avant,
        vh.statut_apres,
        vh.created_at,
        a.nom,
        a.prenom
       FROM billetterie.voyage_historique vh
       LEFT JOIN base_global.agent a ON vh.matricule_agent = a.matricule_agent
       WHERE vh.id_voyage = ?
       ORDER BY vh.created_at ASC`,
      [req.params.id_voyage]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/voyage_historique
 * Permet d'ajouter manuellement une entrée (ex: note manuelle).
 */
exports.addHistorique = async (req, res) => {
  const { id_voyage, statut_avant, statut_apres, matricule_agent } = req.body;
  if (!id_voyage || !statut_apres)
    return res.json({ success: false, message: "id_voyage et statut_apres sont requis" });

  try {
    // Récupérer id_ligne depuis le voyage
    const [vRows] = await db.promise().query(
      "SELECT id_ligne FROM billetterie.voyage WHERE id_voyage = ?",
      [id_voyage]
    );
    const id_ligne = vRows[0]?.id_ligne || null;

    await db.promise().query(
      `INSERT INTO billetterie.voyage_historique
        (id_voyage, id_ligne, matricule_agent, statut_avant, statut_apres,  created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id_voyage, id_ligne, matricule_agent || null, statut_avant || null, statut_apres ]
    );
    res.json({ success: true, message: "Entrée ajoutée" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/voyage_historique_stats
 * Statistiques globales pour le dashboard.
 */
exports.getStats = async (req, res) => {
  try {
    const { start, end } = req.query;
    let dateClause = "1=1";
    const params = [];
    if (start) { dateClause += " AND created_at >= ?"; params.push(start + " 00:00:00"); }
    if (end)   { dateClause += " AND created_at <= ?"; params.push(end   + " 23:59:59"); }

    const [total]     = await db.promise().query(`SELECT COUNT(*) as cnt FROM billetterie.voyage_historique WHERE ${dateClause}`, params);
    const [clotures]  = await db.promise().query(`SELECT COUNT(*) as cnt FROM billetterie.voyage_historique WHERE statut_apres='cloture'  AND ${dateClause}`, params);
    const [activations] = await db.promise().query(`SELECT COUNT(*) as cnt FROM billetterie.voyage_historique WHERE statut_apres='actif'  AND ${dateClause}`, params);
    const [reactivations] = await db.promise().query(
      `SELECT COUNT(*) as cnt FROM billetterie.voyage_historique WHERE statut_apres='actif' AND statut_avant='cloture' AND ${dateClause}`, params
    );

    // Clôtures par jour (30 derniers jours)
    const [parJour] = await db.promise().query(
      `SELECT DATE(created_at) as date, 
              SUM(statut_apres='cloture')  as clotures,
              SUM(statut_apres='actif')    as activations
       FROM billetterie.voyage_historique
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    res.json({
      success: true,
      stats: {
        total:         total[0].cnt,
        clotures:      clotures[0].cnt,
        activations:   activations[0].cnt,
        reactivations: reactivations[0].cnt,
        parJour,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};