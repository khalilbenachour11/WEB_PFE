const router             = require('express').Router();
const { requireAuth }    = require('../middlewares/auth.middleware');

router.use(require('./auth.routes'));

router.use(requireAuth);
router.use(require('./agents.routes'));
router.use(require('./appareils.routes'));
router.use(require('./lignes.routes'));
router.use(require('./voyages.routes'));
router.use(require('./recettes.routes'));
router.use(require('./roles.routes'));
router.use(require('./voyageHistorique.routes'));
router.use(require('./controleur.routes'));
router.use(require('./anomalies.routes'));

module.exports = router;