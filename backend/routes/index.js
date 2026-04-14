const router = require('express').Router();

router.use(require('./auth.routes'));
router.use(require('./agents.routes'));
router.use(require('./appareils.routes'));
router.use(require('./lignes.routes'));
router.use(require('./voyages.routes'));
router.use(require('./recettes.routes'));
router.use(require('./roles.routes'));

module.exports = router;
