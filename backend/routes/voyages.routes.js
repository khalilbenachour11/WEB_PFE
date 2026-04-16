const router = require("express").Router();
const ctrl = require("../controllers/voyages.controller");

router.get("/voyages_receveurs", ctrl.getVoyagesReceveurs);
router.get("/voyages_non_programmes", ctrl.getVoyagesNonProgrammes);
router.get("/segments_voyage/:id_voyage", ctrl.getSegments);
router.post("/ajouter_voyage", ctrl.ajouter);
router.put("/modifier_voyage/:id_voyage", ctrl.modifier);
router.put("/reactiver_voyage/:id_voyage", ctrl.reactiver);
router.delete("/supprimer_voyage/:id_voyage", ctrl.supprimer);

module.exports = router;
