const router = require('express').Router();
const ctrl   = require('../controllers/roles.controller');

router.get('/utilisateurs_web',              ctrl.getAll);
router.post('/utilisateurs_web',             ctrl.upsert);
router.delete('/utilisateurs_web/:matricule',ctrl.supprimer);

module.exports = router;
