const db = require('../config/database');

/**
 * Insère les tarifs, arrêts et segments de voyage pour une ligne.
 * Utilisé à la création ET à la modification (après suppression préalable).
 */
async function insertLigneDetails(id_ligne, segments, arrets_ordre) {
  // Tarifs
  for (const seg of segments) {
    await db.promise().query(
      `INSERT INTO billetterie.tarif_segment (id_ligne, point_a, point_b, prix_normal) VALUES (?,?,?,?)`,
      [id_ligne, seg.point_a, seg.point_b, parseInt(seg.prix_normal) || 0]
    );
  }

  // Arrêts
  for (let i = 0; i < arrets_ordre.length; i++) {
    await db.promise().query(
      `INSERT INTO billetterie.arret (id_ligne, nom_arret, ordre) VALUES (?,?,?)`,
      [id_ligne, arrets_ordre[i], i + 1]
    );
  }

  // Segments voyage (gabarits sans id_vente)
  for (let i = 0; i < arrets_ordre.length - 1; i++) {
    await db.promise().query(
      `INSERT INTO billetterie.segment_voyage (id_vente, id_ligne, point_depart, point_arrivee, ordre, statut)
       VALUES (NULL, ?, ?, ?, ?, 'en_attente')`,
      [id_ligne, arrets_ordre[i], arrets_ordre[i + 1], i + 1]
    );
  }
}

/**
 * Supprime tous les détails modifiables d'une ligne (tarifs, arrêts, segments gabarits).
 */
async function deleteLigneDetails(id_ligne) {
  await db.promise().query(`DELETE FROM billetterie.segment_voyage WHERE id_ligne=? AND id_vente IS NULL`, [id_ligne]);
  await db.promise().query(`DELETE FROM billetterie.arret          WHERE id_ligne=?`, [id_ligne]);
  await db.promise().query(`DELETE FROM billetterie.tarif_segment  WHERE id_ligne=?`, [id_ligne]);
}

module.exports = { insertLigneDetails, deleteLigneDetails };
