/** Hiring routes. Base: /api/hiring */
export {};
const express = require('express');
const Ctrl = require('../controllers/HiringCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const router = express.Router();
const auth = AuthService.authenticate;

router.get('/search', auth, Ctrl.searchCtrl);
router.get('/market-rates', auth, Ctrl.marketRatesCtrl);

module.exports = router;
