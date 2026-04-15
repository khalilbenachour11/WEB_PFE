const db = require('../database');

exports.getAll = (req, res) => {
  db.query(
    `SELECT a.num_serie, a.statut, a.date_de_mise_en_service,
            a.matricule_agent, ag.nom, ag.prenom
     FROM billetterie.appareil a
     LEFT JOIN base_global.agent ag ON a.matricule_agent = ag.matricule_agent`,
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, appareils: results });
    }
  );
};

exports.getStock = (req, res) => {
  db.query(
    `SELECT num_serie, statut FROM billetterie.appareil
     WHERE statut = 'en stocke' AND (matricule_agent IS NULL OR matricule_agent = 0)`,
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, appareils: results });
    }
  );
};

exports.getHistorique = (req, res) => {
  db.query(
    `SELECT a.num_serie, a.date_attribution, a.date_retour, a.statut,
            ag.nom, ag.prenom, ag.matricule_agent
     FROM billetterie.appareil a
     LEFT JOIN base_global.agent ag ON a.matricule_agent = ag.matricule_agent
     ORDER BY a.date_attribution DESC`,
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, historique: results });
    }
  );
};

exports.ajouter = (req, res) => {
  let { num_serie, statut, date_de_mise_en_service } = req.body;

  if (!num_serie || String(num_serie).trim() === '')
    return res.json({ success: false, message: 'Le numéro de série est obligatoire.' });

  if (date_de_mise_en_service)
    date_de_mise_en_service = date_de_mise_en_service.split('T')[0];

  num_serie = parseInt(num_serie);
  if (isNaN(num_serie))
    return res.json({ success: false, message: 'Le numéro de série doit être un nombre entier.' });

  db.query(
    'INSERT INTO billetterie.appareil (num_serie, statut, date_de_mise_en_service) VALUES (?, ?, ?)',
    [num_serie, statut, date_de_mise_en_service || null],
    (err) => {
      if (err) return res.json({ success: false, message: 'Ce numéro de série existe déjà.' });
      res.json({ success: true, message: 'Appareil ajouté avec succès' });
    }
  );
};

exports.modifier = (req, res) => {
  let { num_serie, date_de_mise_en_service } = req.body;
  const old_num_serie = req.params.num_serie;

  if (!num_serie || String(num_serie).trim() === '')
    return res.json({ success: false, message: 'Le numéro de série est obligatoire.' });

  num_serie = parseInt(num_serie);
  if (isNaN(num_serie))
    return res.json({ success: false, message: 'Le numéro de série doit être un nombre entier.' });

  if (date_de_mise_en_service)
    date_de_mise_en_service = date_de_mise_en_service.split('T')[0];

  db.query(
    'UPDATE billetterie.appareil SET num_serie=?, date_de_mise_en_service=? WHERE num_serie=?',
    [num_serie, date_de_mise_en_service || null, old_num_serie],
    (err) => {
      if (err) return res.json({ success: false, message: 'Ce numéro de série existe déjà.' });
      res.json({ success: true, message: 'Appareil modifié avec succès' });
    }
  );
};

exports.attribuer = (req, res) => {
  const { matricule_agent } = req.body;
  const num_serie = req.params.num_serie;
  const today = new Date().toISOString().split('T')[0];
  db.query(
    'UPDATE billetterie.appareil SET matricule_agent=?, statut=?, date_attribution=? WHERE num_serie=?',
    [matricule_agent, 'actif', today, num_serie],
    (err) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, message: 'Appareil attribué avec succès' });
    }
  );
};

exports.modifierStatut = (req, res) => {
  const { statut, liberer } = req.body;
  const num_serie  = req.params.num_serie;
  const today      = new Date().toISOString().split('T')[0];
  const doLiberer  = liberer === true || liberer === 'true';

  if (doLiberer) {
    db.query(
      `UPDATE billetterie.appareil SET date_retour=? WHERE num_serie=? AND date_retour IS NULL`,
      [today, num_serie],
      (err) => {
        if (err) console.error('Erreur historique retour:', err);
        db.query(
          'UPDATE billetterie.appareil SET statut=?, matricule_agent=NULL WHERE num_serie=?',
          [statut, num_serie],
          (err2) => {
            if (err2) return res.json({ success: false, message: err2.message });
            res.json({ success: true, message: 'Statut modifié et agent libéré' });
          }
        );
      }
    );
  } else {
    db.query(
      'UPDATE billetterie.appareil SET statut=? WHERE num_serie=?',
      [statut, num_serie],
      (err) => {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, message: 'Statut modifié avec succès' });
      }
    );
  }
};
