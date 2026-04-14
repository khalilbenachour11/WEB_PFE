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
  const [arrets] = await db.promise().query(
    `SELECT nom_arret, ordre FROM billetterie.arret WHERE id_ligne = ? ORDER BY ordre`,
    [id_ligne]
  );
  if (arrets.length < 2) return false;

  const values = [];
  for (let i = 0; i < arrets.length - 1; i++)
    values.push([id_vente, id_ligne, arrets[i].nom_arret, arrets[i + 1].nom_arret, i + 1, 'en_attente']);

  await db.promise().query(
    `INSERT INTO billetterie.segment_voyage (id_vente, id_ligne, point_depart, point_arrivee, ordre, statut) VALUES ?`,
    [values]
  );
  return true;
}

module.exports = { checkDoublon, insertSegmentsVoyage };
