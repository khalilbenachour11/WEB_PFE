const db = require('../config/database');

/**
 * Vérifie si une ligne est déjà active chez un receveur.
 * @returns {Object|null} L'enregistrement existant ou null.
 */
async function checkDoublon(id_ligne) {
  const [rows] = await db.promise().query(
    `SELECT v.id_vente, ag.nom, ag.prenom
     FROM billetterie.vente v
     JOIN base_global.agent ag ON v.matricule_agent = ag.matricule_agent
     WHERE v.id_ligne = ? AND v.statut != 'cloture'`,
    [id_ligne]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Insère les segments d'un voyage à partir des arrêts de la ligne.
 */
async function insertSegmentsVoyage(id_vente, id_ligne) {
  const [segments] = await db.promise().query(
    `SELECT point_depart, point_arrivee, ordre 
     FROM billetterie.segment_voyage 
     WHERE id_ligne = ? AND id_vente IS NULL 
     ORDER BY ordre`,
    [id_ligne]
  );
  if (segments.length < 1) return false;

  const values = segments.map(s => [
    id_vente, id_ligne, s.point_depart, s.point_arrivee, s.ordre, 'en_attente'
  ]);

  await db.promise().query(
    `INSERT INTO billetterie.segment_voyage 
     (id_vente, id_ligne, point_depart, point_arrivee, ordre, statut) VALUES ?`,
    [values]
  );
  return true;
}

module.exports = { checkDoublon, insertSegmentsVoyage };
