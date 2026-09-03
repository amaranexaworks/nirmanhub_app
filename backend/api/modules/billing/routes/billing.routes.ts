/** Billing routes. Base: /api/billing */
export {};
const express = require('express');
const Ctrl = require('../controllers/BillingCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const router = express.Router();
const auth = AuthService.authenticate;

router.get('/plans', auth, Ctrl.plansCtrl);
router.get('/subscription', auth, Ctrl.currentCtrl);
router.post('/subscribe', auth, Ctrl.subscribeCtrl);

module.exports = router;
