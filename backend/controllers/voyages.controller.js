const db = require("../database");
const {
  checkDoublon,
  insertSegmentsVoyage,
} = require("../services/voyages.service");

exports.getVoyagesReceveurs = (req, res) => {
  db.query(
    `SELECT ag.matricule_agent, ag.nom, ag.prenom,
            v.id_voyage, v.id_ligne, v.date_heure, v.statut, v.type, v.date_cloture
     FROM base_global.agent ag
     LEFT JOIN billetterie.voyage v ON ag.matricule_agent = v.matricule_agent
     WHERE ag.role = 'receveur'
     ORDER BY ag.matricule_agent, v.date_heure DESC`,
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, data: results });
    },
  );
};

exports.getVoyagesNonProgrammes = (req, res) => {
  db.query(
    `SELECT v.id_voyage, v.id_ligne, v.date_heure, v.statut, v.type,
            ag.nom, ag.prenom, ag.matricule_agent, l.nom_ligne
     FROM billetterie.voyage v
     LEFT JOIN base_global.agent ag ON v.matricule_agent = ag.matricule_agent
     LEFT JOIN base_global.ligne l  ON v.id_ligne = l.id_ligne
     WHERE v.statut = 'cloture' ORDER BY v.date_heure DESC`,
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, data: results });
    },
  );
};

exports.getSegments = (req, res) => {
  db.query(
    `SELECT sv.id_segment, sv.point_depart, sv.point_arrivee, sv.ordre, sv.statut
     FROM billetterie.segment_voyage sv WHERE sv.id_voyage = ? ORDER BY sv.ordre`,
    [req.params.id_voyage],
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, segments: results });
    },
  );
};

exports.ajouter = async (req, res) => {
  const { id_ligne, matricule_agent, id_appareil, type, date_heure } = req.body;
  const dateHeure = date_heure
    ? date_heure.replace("T", " ")
    : new Date().toISOString().slice(0, 19).replace("T", " ");

  try {
    const doublon = await checkDoublon(id_ligne);
    if (doublon)
      return res.json({
        success: false,
        message: `Cette ligne est déjà en cours chez ${doublon.prenom} ${doublon.nom}`,
      });

    const [result] = await db.promise().query(
      `INSERT INTO billetterie.voyage (id_ligne, id_appareil, matricule_agent, date_heure, type, statut)
       VALUES (?, ?, ?, ?, ?, 'actif')`,
      [id_ligne, id_appareil, matricule_agent, dateHeure, type],
    );
    const id_voyage = result.insertId;
    const hasSegments = await insertSegmentsVoyage(id_voyage, id_ligne);

    res.json({
      success: true,
      message: hasSegments
        ? "Voyage ajouté avec succès"
        : "Voyage ajouté sans segments (aucun arrêt défini)",
      id: id_voyage,
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

exports.modifier = (req, res) => {
  const { id_ligne, type, date_heure } = req.body;
  const dateHeure = date_heure ? date_heure.replace("T", " ") : null;
  db.query(
    "UPDATE billetterie.voyage SET id_ligne=?, type=?, date_heure=? WHERE id_voyage=?",
    [id_ligne, type, dateHeure, req.params.id_voyage],
    (err) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, message: "Voyage modifié avec succès" });
    },
  );
};

exports.supprimer = (req, res) => {
  const id = req.params.id_voyage;
  db.query(
    `UPDATE billetterie.segment_voyage SET id_voyage = NULL WHERE id_voyage = ?`,
    [id],
    (err) => {
      if (err) return res.json({ success: false, message: err.message });
      db.query(
        "DELETE FROM billetterie.voyage WHERE id_voyage=?",
        [id],
        (err2) => {
          if (err2) return res.json({ success: false, message: err2.message });
          res.json({ success: true, message: "Voyage supprimé avec succès" });
        },
      );
    },
  );
};

exports.reactiver = async (req, res) => {
  const { id_voyage } = req.params;
  try {
    const [rows] = await db
      .promise()
      .query(`SELECT statut FROM billetterie.voyage WHERE id_voyage = ?`, [
        id_voyage,
      ]);
    if (!rows.length)
      return res.json({ success: false, message: "Voyage introuvable" });
    if (rows[0].statut !== "cloture")
      return res.json({
        success: false,
        message: "Ce voyage n'est pas clôturé",
      });

    await db
      .promise()
      .query(
        `UPDATE billetterie.voyage SET statut = 'actif', date_cloture = NULL WHERE id_voyage = ?`,
        [id_voyage],
      );
    await db
      .promise()
      .query(
        `UPDATE billetterie.segment_voyage SET statut = 'en_attente' WHERE id_voyage = ? AND statut = 'cloture'`,
        [id_voyage],
      );
    res.json({ success: true, message: "Voyage réactivé avec succès" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
