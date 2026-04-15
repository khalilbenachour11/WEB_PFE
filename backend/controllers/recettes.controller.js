const db = require('../database');

exports.getRecettes = async (req, res) => {
  try {
    const [total]       = await db.promise().query(
      `SELECT COALESCE(SUM(tv.montant_total), 0) as total_global FROM billetterie.ticket_vendu tv`
    );
    const [parReceveur] = await db.promise().query(
      `SELECT a.matricule_agent, a.nom, a.prenom, COALESCE(SUM(tv.montant_total), 0) as total
       FROM base_global.agent a
       LEFT JOIN billetterie.ticket_vendu tv ON a.matricule_agent = tv.matricule_agent
       WHERE a.role = 'receveur'
       GROUP BY a.matricule_agent, a.nom, a.prenom ORDER BY total DESC`
    );
    const [parLigne]    = await db.promise().query(
      `SELECT l.id_ligne, l.nom_ligne, COALESCE(SUM(tv.montant_total), 0) as total
       FROM base_global.ligne l
       LEFT JOIN billetterie.vente v           ON l.id_ligne = v.id_ligne
       LEFT JOIN billetterie.ticket_vendu tv   ON v.id_vente = tv.id_vente
       GROUP BY l.id_ligne, l.nom_ligne ORDER BY total DESC`
    );
    const [parDate]     = await db.promise().query(
      `SELECT DATE(date_heure) as date, COALESCE(SUM(montant_total), 0) as total
       FROM billetterie.ticket_vendu
       GROUP BY DATE(date_heure) ORDER BY date DESC LIMIT 30`
    );
    res.json({ total_global: total[0].total_global, parReceveur, parLigne, parDate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
