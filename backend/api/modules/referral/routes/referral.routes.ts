/**
 * Referral routes. Base path (mounted in apiRoutes): /api/referral
 */
export {};
const express = require('express');
const Ctrl = require('../controllers/ReferralCtrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');

const router = express.Router();
const auth = AuthService.authenticate;

router.get('/summary', auth, Ctrl.summaryCtrl);   // { code, joined, rewardEarned }
router.get('/', auth, Ctrl.listCtrl);              // people I referred
router.post('/redeem', auth, Ctrl.redeemCtrl);     // attribute me to a code's owner

module.exports = router;
