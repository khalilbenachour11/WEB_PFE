const router = require('express').Router();
const ctrl   = require('../controllers/agents.controller');

router.get('/agents',        ctrl.getAll);
router.get('/agents_libres', ctrl.getAgentsLibres);

module.exports = router;
