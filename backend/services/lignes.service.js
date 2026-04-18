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

  if (!arrets_ordre || arrets_ordre.length < 2) {
    console.log("❌ arrets_ordre vide ou insuffisant — boucle ignorée");
    return;
  }

  for (let i = 0; i < arrets_ordre.length - 1; i++) {
    console.log(
      `Insertion segment ${i + 1}: ${arrets_ordre[i]} → ${arrets_ordre[i + 1]}`,
    );
    const [r] = await db.promise().query(
      `INSERT INTO billetterie.segment_voyage 
       (id_voyage, id_ligne, point_depart, point_arrivee, ordre)
       VALUES (NULL, ?, ?, ?, ?)`,
      [id_ligne, arrets_ordre[i], arrets_ordre[i + 1], i + 1],
    );
    console.log(`✅ Inséré avec id_segment:`, r.insertId);
  }
}

async function deleteLigneDetails(id_ligne) {
  // Supprimer d'abord les segments (FK ticket_vendu → segment_voyage)
  await db
    .promise()
    .query(
      `DELETE FROM billetterie.segment_voyage WHERE id_ligne=? AND id_voyage IS NULL`,
      [id_ligne],
    );

  // Puis supprimer les tarifs
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
