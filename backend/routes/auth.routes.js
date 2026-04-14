const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');

router.post('/login',                    ctrl.login);
router.post('/login_bootstrap',          ctrl.loginBootstrap);
router.put('/modifier_mdp/:matricule',   ctrl.modifierMdp);

module.exports = router;
