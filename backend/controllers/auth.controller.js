const db = require('../database');
const {
  hashPassword,
  comparePassword,
  isRoleAutorise,
  generateToken,
} = require('../services/auth.service');

exports.login = (req, res) => {
  const { matricule, mot_de_passe } = req.body;
  db.query(
    `SELECT a.*, u.role_web
     FROM base_global.agent a
     LEFT JOIN billetterie.utilisateurs_web u
       ON a.matricule_agent = u.matricule_agent
     WHERE a.matricule_agent = ?`,
    [matricule],
    async (err, results) => {
      if (err)             return res.json({ success: false, message: 'Erreur serveur' });
      if (!results.length) return res.json({ success: false, message: 'Matricule introuvable' });

      const agent = results[0];
      const match = await comparePassword(mot_de_passe, agent.mot_de_passe);
      if (!match) return res.json({ success: false, message: 'Mot de passe incorrect' });

      const roleEffectif = agent.role_web || agent.role;
      if (!isRoleAutorise(roleEffectif))
        return res.json({ success: false, message: 'Accès refusé — rôle non autorisé' });

      const payload = {
        matricule: agent.matricule_agent,
        nom:       agent.nom,
        prenom:    agent.prenom,
        role:      roleEffectif,
      };

      const token = generateToken(payload);

      res.json({
        success: true,
        token,
        agent: payload,
      });
    }
  );
};

exports.modifierMdp = async (req, res) => {
  const { mot_de_passe } = req.body;
  if (!mot_de_passe || mot_de_passe.trim() === '')
    return res.json({ success: false, message: 'Mot de passe vide' });

  const hashed = await hashPassword(mot_de_passe);
  db.query(
    'UPDATE base_global.agent SET mot_de_passe=? WHERE matricule_agent=?',
    [hashed, req.params.matricule],
    (err) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, message: 'Mot de passe modifié avec succès' });
    }
  );
};

exports.loginBootstrap = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT COUNT(*) as cnt FROM billetterie.utilisateurs_web'
    );
    if (rows[0].cnt > 0)
      return res.status(403).json({ success: false });

    const payload = {
      id: 0, matricule: 0,
      nom: 'Système', prenom: 'Admin', role: 'informatique',
    };

    const token = generateToken(payload);

    res.json({ success: true, token, agent: payload });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};