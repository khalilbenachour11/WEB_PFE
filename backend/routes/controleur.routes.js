// backend/routes/controleur.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/controleur.controller');

router.get('/controleur/journees',       ctrl.getJournees);
router.get('/controleur/tickets',        ctrl.getTickets);
router.get('/controleur/rapport_detail', ctrl.getRapportDetail);

module.exports = router;
