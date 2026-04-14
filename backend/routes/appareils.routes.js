const router = require('express').Router();
const ctrl   = require('../controllers/appareils.controller');

router.get('/appareils',                         ctrl.getAll);
router.get('/appareils_stock',                   ctrl.getStock);
router.get('/historique_appareils',              ctrl.getHistorique);
router.post('/ajouter_appareil',                 ctrl.ajouter);
router.put('/modifier_appareil/:num_serie',      ctrl.modifier);
router.put('/attribuer_appareil/:num_serie',     ctrl.attribuer);
router.put('/modifier_statut/:num_serie',        ctrl.modifierStatut);

module.exports = router;
