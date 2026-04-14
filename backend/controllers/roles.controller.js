const db = require('../config/database');

exports.getAll = (req, res) => {
  db.query(
    `SELECT u.id, u.matricule_agent, u.role_web, u.date_attribution, a.nom, a.prenom
     FROM billetterie.utilisateurs_web u
     LEFT JOIN base_global.agent a ON u.matricule_agent = a.matricule_agent
     ORDER BY u.date_attribution DESC`,
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, data: results });
    }
  );
};

exports.upsert = (req, res) => {
  const { matricule_agent, role_web } = req.body;
  const today = new Date().toISOString().split('T')[0];
  db.query(
    `INSERT INTO billetterie.utilisateurs_web (matricule_agent, role_web, date_attribution)
     VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role_web = ?, date_attribution = ?`,
    [matricule_agent, role_web, today, role_web, today],
    (err) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, message: 'Rôle défini avec succès' });
    }
  );
};

exports.supprimer = (req, res) => {
  db.query(
    'DELETE FROM billetterie.utilisateurs_web WHERE matricule_agent = ?',
    [req.params.matricule],
    (err) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, message: 'Rôle supprimé avec succès' });
    }
  );
};
