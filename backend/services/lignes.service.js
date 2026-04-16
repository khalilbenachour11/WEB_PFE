const db = require("../database");

async function insertLigneDetails(id_ligne, segments, arrets_ordre) {
  for (const seg of segments) {
    await db
      .promise()
      .query(
        `INSERT INTO billetterie.tarif_segment (id_ligne, point_a, point_b, prix_normal) VALUES (?,?,?,?)`,
        [id_ligne, seg.point_a, seg.point_b, parseInt(seg.prix_normal) || 0],
      );
  }

  for (let i = 0; i < arrets_ordre.length - 1; i++) {
    await db.promise().query(
      `INSERT INTO billetterie.segment_voyage 
       (id_voyage, id_ligne, point_depart, point_arrivee, ordre)
       VALUES (NULL, ?, ?, ?, ?)`,
      [id_ligne, arrets_ordre[i], arrets_ordre[i + 1], i + 1],
    );
  }
}

async function deleteLigneDetails(id_ligne) {
  await db
    .promise()
    .query(
      `DELETE FROM billetterie.segment_voyage WHERE id_ligne=? AND id_voyage IS NULL`,
      [id_ligne],
    );

  await db
    .promise()
    .query(`DELETE FROM billetterie.tarif_segment WHERE id_ligne=?`, [
      id_ligne,
    ]);
}

module.exports = {
  insertLigneDetails,
  deleteLigneDetails,
};
