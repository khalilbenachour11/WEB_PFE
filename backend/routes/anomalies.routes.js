const router = require('express').Router();
const ctrl   = require('../controllers/anomalies.controller');

router.get('/anomalies',                    ctrl.getAll);
router.post('/anomalies/verifier',          ctrl.verifier);
router.post('/anomalies/importer',          ctrl.importer);
router.put('/anomalies/:id/enregistrer',    ctrl.enregistrer);
router.put('/anomalies/:id/ignorer',        ctrl.ignorer);
router.delete('/anomalies/:id',             ctrl.supprimer);

module.exports = router;