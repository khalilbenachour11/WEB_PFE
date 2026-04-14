const router = require('express').Router();
const ctrl   = require('../controllers/agents.controller');

router.get('/agents',        ctrl.getAll);
router.get('/agents_libres', ctrl.getAgentsLibres);
router.get('/agences', ctrl.getAgences);

module.exports = router;
