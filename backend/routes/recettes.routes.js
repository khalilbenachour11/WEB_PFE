const router = require('express').Router();
const ctrl   = require('../controllers/recettes.controller');

router.get('/recettes', ctrl.getRecettes);

module.exports = router;
