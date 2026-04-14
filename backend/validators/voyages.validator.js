/**
 * Valide les champs requis pour créer un voyage.
 * @param {{ id_ligne, matricule_agent, type }} body
 * @returns {{ valid: boolean, error?: string }}
 */
function validateVoyage({ id_ligne, matricule_agent, type }) {
  if (!id_ligne)         return { valid: false, error: 'id_ligne est requis' };
  if (!matricule_agent)  return { valid: false, error: 'matricule_agent est requis' };
  if (!type)             return { valid: false, error: 'type est requis' };
  return { valid: true };
}

module.exports = { validateVoyage };
