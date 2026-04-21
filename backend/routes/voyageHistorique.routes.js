const router = require("express").Router();
const ctrl   = require("../controllers/voyageHistorique.controller");

router.get("/voyage_historique",               ctrl.getHistorique);
router.get("/voyage_historique_stats",         ctrl.getStats);
router.get("/voyage_historique/:id_voyage",    ctrl.getHistoriqueByVoyage);
router.post("/voyage_historique",              ctrl.addHistorique);

module.exports = router;