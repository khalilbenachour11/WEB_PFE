/**
 * Valide un tableau de segments tarifaires.
 * @param {Array} segments
 * @returns {{ valid: boolean, error?: string }}
 */
function validateSegments(segments) {
  if (!segments || !Array.isArray(segments) || segments.length === 0)
    return { valid: false, error: 'Au moins un segment est requis' };

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg.point_a || !seg.point_b)
      return { valid: false, error: `Segment ${i + 1}: Points manquants` };
    if (seg.point_a === seg.point_b)
      return { valid: false, error: `Segment ${i + 1}: Point A et B identiques` };
    if (!seg.prix_normal || parseInt(seg.prix_normal) < 0)
      return { valid: false, error: `Segment ${i + 1}: Prix invalide` };
  }
  return { valid: true };
}

/**
 * Valide la liste ordonnée des arrêts.
 * @param {Array} arrets
 * @returns {{ valid: boolean, error?: string }}
 */
function validateArrets(arrets) {
  if (!arrets || !Array.isArray(arrets) || arrets.length < 2)
    return { valid: false, error: "L'ordre des arrêts est requis (minimum 2 arrêts)." };
  return { valid: true };
}

module.exports = { validateSegments, validateArrets };
