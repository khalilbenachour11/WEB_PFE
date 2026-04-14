const db = require('../config/database');

exports.getAll = (req, res) => {
  db.query(
    `SELECT matricule_agent, nom, prenom, date_naissance, code_agence, direction, role,
            (mot_de_passe IS NOT NULL AND mot_de_passe != '') AS has_password
     FROM base_global.agent`,
    (err, results) => {
      if (err) return res.json({ success: false });
      res.json({ success: true, agents: results });
    }
  );
};

exports.getAgentsLibres = (req, res) => {
  db.query(
    `SELECT ag.matricule_agent, ag.nom, ag.prenom
     FROM base_global.agent ag
     WHERE ag.role = 'receveur'
     AND ag.matricule_agent NOT IN (
       SELECT matricule_agent FROM billetterie.appareil
       WHERE matricule_agent IS NOT NULL AND matricule_agent != 0
     )`,
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, agents: results });
    }
  );
};
