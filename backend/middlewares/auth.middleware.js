const { verifyToken } = require('../services/auth.service');

const ROLES_AUTORISES = ['informatique', 'direction', 'controleur'];

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Token manquant' });

  const token = authHeader.split(' ')[1];
  try {
    req.agent = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
}

function requireRole(...roles) {
  const allowed = roles.length ? roles : ROLES_AUTORISES;
  return (req, res, next) => {
    if (!req.agent)
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    if (!allowed.includes(req.agent.role))
      return res.status(403).json({ success: false, message: 'Accès refusé — rôle non autorisé' });
    next();
  };
}

module.exports = { requireAuth, requireRole, ROLES_AUTORISES };