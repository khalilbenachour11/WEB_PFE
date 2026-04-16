const router = require('express').Router();
const ctrl   = require('../controllers/lignes.controller');

router.get('/lignes',                              ctrl.getAll);
router.get('/lignes_avec_segments',                ctrl.getAllAvecSegments);
router.get('/segments_ligne/:id_ligne',            ctrl.getSegments);
router.get('/tarifs_ligne/:id_ligne',              ctrl.getTarifs);
router.get('/verification_segments/:id_ligne',     ctrl.verifierSegments);
router.post('/ajouter_ligne',                      ctrl.ajouter);
router.put('/lignes/:id',                          ctrl.modifier);
router.delete('/lignes/:id',                       ctrl.supprimer);
router.get('/segments_voyage/:id_voyage',          ctrl.getSegmentsVoyage);


module.exports = router;
