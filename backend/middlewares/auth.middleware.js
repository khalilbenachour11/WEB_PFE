const ROLES_AUTORISES = ['informatique', 'direction', 'controleur'];

/**
 * Vérifie que l'agent connecté possède un rôle autorisé.
 * Attend un header Authorization: Bearer <JSON stringified agent>
 * ou un body/session — à adapter selon votre stratégie d'auth (JWT, session…).
 *
 * Pour l'instant ce middleware valide juste que le rôle transmis est autorisé.
 */
function requireRole(...roles) {
  const allowed = roles.length ? roles : ROLES_AUTORISES;
  return (req, res, next) => {
    const agent = req.agent; // doit être peuplé en amont (JWT / session)
    if (!agent) return res.status(401).json({ success: false, message: 'Non authentifié' });
    if (!allowed.includes(agent.role))
      return res.status(403).json({ success: false, message: 'Accès refusé — rôle non autorisé' });
    next();
  };
}

module.exports = { requireRole, ROLES_AUTORISES };
