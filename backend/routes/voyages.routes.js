const router = require('express').Router();
const ctrl   = require('../controllers/voyages.controller');

router.get('/voyages_receveurs',               ctrl.getVoyagesReceveurs);
router.get('/voyages_non_programmes',          ctrl.getVoyagesNonProgrammes);
router.get('/segments_voyage/:id_vente',       ctrl.getSegments);
router.post('/ajouter_voyage',                 ctrl.ajouter);
router.put('/modifier_voyage/:id_vente',       ctrl.modifier);
router.put('/reactiver_voyage/:id_vente',      ctrl.reactiver);
router.delete('/supprimer_voyage/:id_vente',   ctrl.supprimer);

module.exports = router;
