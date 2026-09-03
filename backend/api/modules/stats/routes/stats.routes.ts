/**
 * Stats routes. Base path (mounted in apiRoutes): /api/stats
 * PUBLIC — no auth. Used by the pre-login splash for social proof.
 */
export {};
const express = require('express');
const StatsCtrl = require('../controllers/StatsCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');

const router = express.Router();
const auth = AuthService.authenticate;

router.get('/users/count', StatsCtrl.userCountCtrl);
router.get('/dashboard', auth, StatsCtrl.dashboardCtrl);

module.exports = router;
