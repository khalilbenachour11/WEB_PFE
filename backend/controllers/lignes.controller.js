const db = require('../database');
const { insertLigneDetails, deleteLigneDetails } = require('../services/lignes.service');
const { validateSegments, validateArrets }        = require('../validators/lignes.validator');

exports.getAll = (req, res) => {
  db.query(
    'SELECT id_ligne, nom_ligne FROM base_global.ligne',
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, lignes: results });
    }
  );
};

exports.getAllAvecSegments = async (req, res) => {
  try {
    const [lignes]   = await db.promise().query(
      `SELECT id_ligne, nom_ligne, point_depart, point_arrive, code_agence
       FROM base_global.ligne ORDER BY nom_ligne`
    );
    const [segments] = await db.promise().query(
      `SELECT id, id_ligne, point_a, point_b, prix_normal,
              ROUND(prix_normal * 0.5,  3) AS prix_reduit_50,
              ROUND(prix_normal * 0.25, 3) AS prix_reduit_75
       FROM billetterie.tarif_segment ORDER BY id_ligne, id`
    );
    const result = lignes.map(l => ({
      ...l,
      segments: segments.filter(s => s.id_ligne === l.id_ligne),
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.getSegments = (req, res) => {
  db.query(
    `SELECT DISTINCT point_depart, point_arrivee, ordre
     FROM billetterie.segment_voyage
     WHERE id_ligne = ? AND id_vente IS NULL
     ORDER BY ordre`,
    [req.params.id_ligne],
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      if (results.length > 0) return res.json({ success: true, segments: results });

      db.query(
        `SELECT nom_arret AS point_depart,
                LEAD(nom_arret) OVER (ORDER BY ordre) AS point_arrivee,
                ordre
         FROM billetterie.arret WHERE id_ligne = ? ORDER BY ordre`,
        [req.params.id_ligne],
        (err2, arretResults) => {
          if (err2) return res.json({ success: false, message: err2.message });
          res.json({ success: true, segments: arretResults.filter(r => r.point_arrivee !== null) });
        }
      );
    }
  );
};

exports.getTarifs = (req, res) => {
  db.query(
    'SELECT * FROM billetterie.tarif_segment WHERE id_ligne = ?',
    [req.params.id_ligne],
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, tarifs: results });
    }
  );
};

exports.verifierSegments = (req, res) => {
  const id = req.params.id_ligne;
  db.query('SELECT COUNT(*) as count FROM base_global.ligne WHERE id_ligne = ?',                              [id], (err, r1) => {
  db.query('SELECT COUNT(*) as count FROM billetterie.tarif_segment WHERE id_ligne = ?',                     [id], (err, r2) => {
  db.query('SELECT COUNT(*) as count FROM billetterie.arret WHERE id_ligne = ?',                             [id], (err, r3) => {
  db.query('SELECT COUNT(*) as count FROM billetterie.segment_voyage WHERE id_ligne = ? AND id_vente IS NULL',[id], (err, r4) => {
    const t = { ligne: r1[0].count, tarifs: r2[0].count, arrets: r3[0].count, segments: r4[0].count };
    const all_ok = t.ligne > 0 && t.tarifs > 0 && t.arrets > 0 && t.segments > 0;
    res.json({ success: true, id_ligne: id, status: all_ok ? 'COMPLETE' : 'INCOMPLETE', tables: t, all_saved: all_ok });
  });});});});
};

exports.ajouter = (req, res) => {
  const { nom_ligne, point_depart, point_arrive, code_agence, segments, arrets_ordre } = req.body;

  if (!nom_ligne || !point_depart || !point_arrive)
    return res.json({ success: false, message: 'Veuillez remplir tous les champs obligatoires' });

  const vs = validateSegments(segments);
  if (!vs.valid) return res.json({ success: false, message: vs.error });

  const va = validateArrets(arrets_ordre);
  if (!va.valid) return res.json({ success: false, message: va.error });

  db.query(
    'INSERT INTO base_global.ligne (nom_ligne, point_depart, point_arrive, code_agence) VALUES (?, ?, ?, ?)',
    [nom_ligne, point_depart, point_arrive, code_agence],
    async (err, result) => {
      if (err) return res.json({ success: false, message: 'Erreur insertion ligne: ' + err.message });
      try {
        await insertLigneDetails(result.insertId, segments, arrets_ordre);
        res.json({ success: true, message: 'Ligne ajoutée avec succès', id: result.insertId });
      } catch (e) {
        res.json({ success: false, message: e.message });
      }
    }
  );
};

exports.modifier = async (req, res) => {
  const { id } = req.params;
  const { nom_ligne, point_depart, point_arrive, segments, arrets_ordre } = req.body;

  const vs = validateSegments(segments);
  if (!vs.valid) return res.json({ success: false, message: vs.error });

  const va = validateArrets(arrets_ordre);
  if (!va.valid) return res.json({ success: false, message: va.error });

  try {
    await db.promise().query('START TRANSACTION');
    await db.promise().query(
      `UPDATE base_global.ligne SET nom_ligne=?, point_depart=?, point_arrive=? WHERE id_ligne=?`,
      [nom_ligne, point_depart, point_arrive, id]
    );
    await deleteLigneDetails(id);
    await insertLigneDetails(id, segments, arrets_ordre);
    await db.promise().query('COMMIT');
    res.json({ success: true, message: 'Ligne modifiée avec succès' });
  } catch (err) {
    await db.promise().query('ROLLBACK');
    res.status(500).json({ error: 'Erreur modification: ' + err.message });
  }
};

exports.supprimer = async (req, res) => {
  const { id } = req.params;
  try {
    await db.promise().query('START TRANSACTION');
    await deleteLigneDetails(id);
    await db.promise().query(`DELETE FROM base_global.ligne WHERE id_ligne = ?`, [id]);
    await db.promise().query('COMMIT');
    res.json({ success: true, message: 'Ligne supprimée avec succès' });
  } catch (err) {
    await db.promise().query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Erreur suppression: ' + err.message });
  }
};
